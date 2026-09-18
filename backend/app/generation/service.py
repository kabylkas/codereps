import asyncio
import json
import logging
import os
import tempfile
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.config import settings
from app.generation.llm_client import get_openai_client
from app.generation.prompts import (
    PROBLEM_SYSTEM_PROMPT,
    SOLUTION_SYSTEM_PROMPT,
    TEST_INPUT_SYSTEM_PROMPT,
    build_problem_prompt,
    build_solution_prompt,
    build_fix_solution_prompt,
    build_test_input_prompt,
)
from app.generation.schemas import (
    GenerationRequest,
    LLMProblemStatementsResponse,
    LLMSolutionResponse,
    LLMTestInputsResponse,
)
from app.problems.models import Problem, TestCase, CourseProblem
from app.problems.schemas import ProblemResponse
from app.topics.models import Topic

logger = logging.getLogger(__name__)

EXEC_TIMEOUT = 10
MAX_SOLUTION_RETRIES = 2  # retry up to 2 times if solution fails execution


def _clean_llm_response(raw_content: str) -> str:
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return cleaned


async def _call_llm(model: str, system_prompt: str, user_prompt: str) -> str:
    """Call an LLM via OpenRouter and return the raw content string."""
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown fences."},
        ],
        temperature=0.7,
    )
    raw = response.choices[0].message.content
    if not raw:
        raise ValueError(f"LLM ({model}) returned empty response")
    logger.info("LLM %s response length: %d chars", model, len(raw))
    return _clean_llm_response(raw)


# ═══════════════════════════════════════════
#  Code execution helpers
# ═══════════════════════════════════════════

async def _execute_solution(
    code: str,
    language: str,
    stdin_input: str,
) -> tuple[str | None, str | None]:
    """Execute solution code with given stdin input.

    Returns (stdout_output, error_message). On success error_message is None.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        if language == "python":
            return await _exec_python(code, stdin_input, tmpdir)
        elif language == "c":
            return await _exec_c(code, stdin_input, tmpdir)
        else:
            return None, f"Unsupported language for execution: {language}"


async def _exec_python(code: str, stdin_input: str, tmpdir: str) -> tuple[str | None, str | None]:
    code_path = os.path.join(tmpdir, "solution.py")
    with open(code_path, "w") as f:
        f.write(code)

    proc = await asyncio.create_subprocess_exec(
        "python3", code_path,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input=stdin_input.encode()),
            timeout=EXEC_TIMEOUT,
        )
    except asyncio.TimeoutError:
        proc.kill()
        return None, f"Execution timed out ({EXEC_TIMEOUT}s)"

    if proc.returncode != 0:
        return None, stderr.decode(errors="replace").strip()

    return stdout.decode(errors="replace").strip(), None


async def _exec_c(code: str, stdin_input: str, tmpdir: str) -> tuple[str | None, str | None]:
    code_path = os.path.join(tmpdir, "solution.c")
    binary_path = os.path.join(tmpdir, "solution")
    with open(code_path, "w") as f:
        f.write(code)

    # Compile
    compile_proc = await asyncio.create_subprocess_exec(
        "gcc", code_path, "-o", binary_path, "-lm",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    try:
        _, compile_err = await asyncio.wait_for(
            compile_proc.communicate(), timeout=EXEC_TIMEOUT,
        )
    except asyncio.TimeoutError:
        compile_proc.kill()
        return None, "Compilation timed out"

    if compile_proc.returncode != 0:
        return None, f"Compilation error: {compile_err.decode(errors='replace').strip()}"

    # Run
    proc = await asyncio.create_subprocess_exec(
        binary_path,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=tmpdir,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input=stdin_input.encode()),
            timeout=EXEC_TIMEOUT,
        )
    except asyncio.TimeoutError:
        proc.kill()
        return None, f"Execution timed out ({EXEC_TIMEOUT}s)"

    if proc.returncode != 0:
        return None, stderr.decode(errors="replace").strip()

    return stdout.decode(errors="replace").strip(), None


# ═══════════════════════════════════════════
#  Pipeline steps
# ═══════════════════════════════════════════

# ── Step 1: Generate problem statements ──

async def _generate_problem_statements(
    db: AsyncSession,
    topic: Topic,
    request: GenerationRequest,
) -> LLMProblemStatementsResponse:
    existing_result = await db.execute(
        select(Problem.title, Problem.description).where(Problem.topic_id == topic.id)
    )
    existing_problems = [
        {"title": row[0], "description": row[1]} for row in existing_result.all()
    ]

    prompt = build_problem_prompt(
        topic_name=topic.name,
        topic_description=topic.description,
        language=request.language,
        difficulty=request.difficulty,
        num_problems=request.num_problems,
        test_type=request.test_type,
        custom_instructions=request.custom_instructions,
        existing_problems=existing_problems,
    )

    raw = await _call_llm(settings.model_problem, PROBLEM_SYSTEM_PROMPT, prompt)
    parsed = json.loads(raw)
    return LLMProblemStatementsResponse.model_validate(parsed)


# ── Step 2: Generate solution for a single problem ──

async def _generate_solution(
    title: str,
    description: str,
    starter_code: str | None,
    language: str,
    test_type: str,
) -> str:
    prompt = build_solution_prompt(title, description, starter_code, language, test_type)
    raw = await _call_llm(settings.model_code, SOLUTION_SYSTEM_PROMPT, prompt)
    parsed = json.loads(raw)
    result = LLMSolutionResponse.model_validate(parsed)
    return result.solution_code


# ── Step 3: Generate test inputs, then execute solution to get expected outputs ──

async def _generate_and_run_tests(
    title: str,
    description: str,
    solution_code: str,
    language: str,
    test_type: str,
    num_test_cases: int,
) -> tuple[list[dict], list[dict]]:
    """Generate test inputs via LLM, run solution, return (passed_tests, failures).

    Returns:
        passed_tests: list of {input_data, expected_output, metadata_json}
        failures: list of {input, error} for inputs that failed execution
    """
    prompt = build_test_input_prompt(title, description, language, test_type, num_test_cases)
    raw = await _call_llm(settings.model_code, TEST_INPUT_SYSTEM_PROMPT, prompt)
    parsed = json.loads(raw)
    inputs_response = LLMTestInputsResponse.model_validate(parsed)

    passed_tests = []
    failures = []

    for input_data in inputs_response.inputs:
        output, error = await _execute_solution(solution_code, language, input_data)
        if error:
            logger.warning("Test execution failed for '%s': %s", title, error)
            failures.append({"input": input_data, "error": error})
            continue

        passed_tests.append({
            "input_data": input_data,
            "expected_output": output or "",
            "metadata_json": None,
        })

    return passed_tests, failures


async def _generate_solution_and_tests(
    title: str,
    description: str,
    starter_code: str | None,
    language: str,
    test_type: str,
    num_test_cases: int,
    on_status=None,
) -> tuple[str, list[dict]]:
    """Generate solution + tests with retry loop.

    If test execution fails, asks the model to fix the solution and retries.
    on_status is an optional callback(message: str) for progress updates.

    Returns (solution_code, test_cases).
    """
    # Initial solution
    solution_code = await _generate_solution(
        title, description, starter_code, language, test_type,
    )

    for attempt in range(1 + MAX_SOLUTION_RETRIES):
        passed_tests, failures = await _generate_and_run_tests(
            title, description, solution_code, language, test_type, num_test_cases,
        )

        if passed_tests:
            if failures:
                logger.info(
                    "'%s': %d/%d tests passed (attempt %d)",
                    title, len(passed_tests), len(passed_tests) + len(failures), attempt + 1,
                )
            return solution_code, passed_tests

        # All tests failed — try to fix the solution
        if attempt < MAX_SOLUTION_RETRIES:
            if on_status:
                await on_status(
                    f"Solution for \"{title}\" failed all tests — "
                    f"asking model to fix (retry {attempt + 1}/{MAX_SOLUTION_RETRIES})..."
                )
            logger.info("'%s': all tests failed, requesting fix (retry %d)", title, attempt + 1)

            fix_prompt = build_fix_solution_prompt(
                title, description, starter_code, language, test_type,
                broken_code=solution_code,
                error_samples=failures,
            )
            raw = await _call_llm(settings.model_code, SOLUTION_SYSTEM_PROMPT, fix_prompt)
            parsed = json.loads(raw)
            result = LLMSolutionResponse.model_validate(parsed)
            solution_code = result.solution_code

    # Exhausted retries
    error_preview = "; ".join(f["error"][:80] for f in failures[:3])
    raise ValueError(
        f"Solution failed all tests after {MAX_SOLUTION_RETRIES + 1} attempts. "
        f"Errors: {error_preview}"
    )


# ── Save a completed problem to DB ──

async def _save_problem(
    db: AsyncSession,
    title: str,
    description: str,
    starter_code: str | None,
    solution_code: str,
    test_cases_data: list[dict],
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> Problem:
    problem = Problem(
        title=title,
        description=description,
        difficulty=request.difficulty,
        language=request.language,
        created_by=user_id,
        starter_code=starter_code,
        solution_code=solution_code,
        topic_id=topic.id,
    )
    db.add(problem)
    await db.flush()

    for idx, tc in enumerate(test_cases_data):
        test_case = TestCase(
            problem_id=problem.id,
            test_type=request.test_type,
            input_data=tc["input_data"],
            expected_output=tc["expected_output"],
            metadata_json=tc.get("metadata_json"),
            order_index=idx,
        )
        db.add(test_case)

    cp = CourseProblem(
        course_id=course_id,
        problem_id=problem.id,
        added_by=user_id,
    )
    db.add(cp)
    await db.flush()

    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.id == problem.id)
    )
    return result.scalar_one()


# ═══════════════════════════════════════════
#  Streaming pipeline (used by the frontend)
# ═══════════════════════════════════════════

async def generate_problems_stream(
    db: AsyncSession,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> AsyncGenerator[str, None]:
    """Yields SSE-formatted events as the 3-step pipeline runs."""
    total = request.num_problems

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # ── Step 1: Problem statements ──
    yield sse("status", {
        "message": f"Step 1/3: Generating {total} problem statement(s)...",
        "phase": "generating_problems",
    })

    try:
        statements = await _generate_problem_statements(db, topic, request)
    except Exception as e:
        logger.exception("Step 1 failed")
        yield sse("error", {"message": f"Failed to generate problem statements: {e}"})
        return

    actual_count = len(statements.problems)
    yield sse("status", {
        "message": f"Got {actual_count} problem statement(s). Generating solutions...",
        "phase": "generating_solutions",
        "current": 0,
        "total": actual_count,
    })

    # ── Step 2 & 3: For each problem, generate solution + test with retries ──
    for i, stmt in enumerate(statements.problems):
        problem_num = i + 1

        yield sse("status", {
            "message": f"Step 2/3: Generating solution for \"{stmt.title}\" ({problem_num}/{actual_count})...",
            "phase": "generating_solution",
            "current": problem_num,
            "total": actual_count,
        })

        # Collect status messages from the retry loop
        status_messages: list[str] = []

        async def on_retry_status(msg: str):
            status_messages.append(msg)

        try:
            solution_code, test_cases_data = await _generate_solution_and_tests(
                stmt.title, stmt.description, stmt.starter_code,
                request.language, request.test_type, request.num_test_cases,
                on_status=on_retry_status,
            )
        except Exception as e:
            logger.exception("Solution+tests failed for %s", stmt.title)
            yield sse("error", {"message": f"Failed for \"{stmt.title}\": {e}"})
            return

        # Emit any retry status messages
        for msg in status_messages:
            yield sse("status", {
                "message": msg,
                "phase": "retrying",
                "current": problem_num,
                "total": actual_count,
            })

        # Save to DB
        yield sse("status", {
            "message": f"Saving \"{stmt.title}\" ({len(test_cases_data)} tests passed)...",
            "phase": "saving",
            "current": problem_num,
            "total": actual_count,
        })

        try:
            problem = await _save_problem(
                db, stmt.title, stmt.description, stmt.starter_code,
                solution_code, test_cases_data,
                topic, course_id, user_id, request,
            )
            problem_data = ProblemResponse.model_validate(problem).model_dump(mode="json")
            yield sse("problem_saved", {
                "problem": problem_data,
                "current": problem_num,
                "total": actual_count,
            })
        except Exception as e:
            logger.exception("Save failed for %s", stmt.title)
            yield sse("error", {"message": f"Failed to save \"{stmt.title}\": {e}"})
            return

    await db.commit()
    yield sse("done", {
        "message": f"Successfully generated {actual_count} problems!",
        "total": actual_count,
    })


# ── Non-streaming version ──

async def generate_problems(
    db: AsyncSession,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> list[Problem]:
    statements = await _generate_problem_statements(db, topic, request)

    problems = []
    for stmt in statements.problems:
        solution_code, test_cases_data = await _generate_solution_and_tests(
            stmt.title, stmt.description, stmt.starter_code,
            request.language, request.test_type, request.num_test_cases,
        )
        problem = await _save_problem(
            db, stmt.title, stmt.description, stmt.starter_code,
            solution_code, test_cases_data,
            topic, course_id, user_id, request,
        )
        problems.append(problem)

    await db.commit()
    return problems
