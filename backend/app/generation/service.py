import json
import logging
import re
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.config import settings
from app.generation.llm_client import get_openai_client
from app.generation.prompts import SYSTEM_PROMPT, build_generation_prompt
from app.generation.schemas import GenerationRequest, LLMResponse
from app.problems.models import Problem, TestCase, CourseProblem
from app.problems.schemas import ProblemResponse
from app.topics.models import Topic

logger = logging.getLogger(__name__)

_TITLE_RE = re.compile(r'"title"\s*:\s*"([^"]+)"')


def _clean_llm_response(raw_content: str) -> str:
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return cleaned


async def _build_prompt_and_call_llm(
    db: AsyncSession,
    topic: Topic,
    request: GenerationRequest,
) -> LLMResponse:
    existing_result = await db.execute(
        select(Problem.title, Problem.description).where(Problem.topic_id == topic.id)
    )
    existing_problems = [
        {"title": row[0], "description": row[1]} for row in existing_result.all()
    ]

    prompt = build_generation_prompt(
        topic_name=topic.name,
        topic_description=topic.description,
        language=request.language,
        difficulty=request.difficulty,
        num_problems=request.num_problems,
        num_test_cases=request.num_test_cases,
        test_type=request.test_type,
        custom_instructions=request.custom_instructions,
        existing_problems=existing_problems,
    )

    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown fences."},
        ],
        temperature=0.7,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("LLM returned empty response")

    logger.info("LLM response length: %d chars", len(raw_content))
    cleaned = _clean_llm_response(raw_content)

    try:
        raw = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON: %s...", cleaned[:500])
        raise ValueError(f"LLM returned invalid JSON: {e}")

    return LLMResponse.model_validate(raw)


async def _save_problem(
    db: AsyncSession,
    p_data,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> Problem:
    problem = Problem(
        title=p_data.title,
        description=p_data.description,
        difficulty=request.difficulty,
        language=request.language,
        created_by=user_id,
        starter_code=p_data.starter_code,
        solution_code=p_data.solution_code,
        topic_id=topic.id,
    )
    db.add(problem)
    await db.flush()

    for idx, tc in enumerate(p_data.test_cases):
        test_case = TestCase(
            problem_id=problem.id,
            test_type=request.test_type,
            input_data=tc.input_data,
            expected_output=tc.expected_output,
            metadata_json=tc.metadata_json,
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


async def generate_problems(
    db: AsyncSession,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> list[Problem]:
    parsed = await _build_prompt_and_call_llm(db, topic, request)

    problems = []
    for p_data in parsed.problems:
        problem = await _save_problem(db, p_data, topic, course_id, user_id, request)
        problems.append(problem)

    await db.commit()
    return problems


async def _stream_llm_call(
    db: AsyncSession,
    topic: Topic,
    request: GenerationRequest,
) -> AsyncGenerator[tuple[str, str], None]:
    """Stream the LLM call, yielding (event_type, content) tuples.

    Yields:
      ("title_found", title) — each time a new problem title is detected
      ("llm_done", full_content) — when the LLM finishes
    """
    existing_result = await db.execute(
        select(Problem.title, Problem.description).where(Problem.topic_id == topic.id)
    )
    existing_problems = [
        {"title": row[0], "description": row[1]} for row in existing_result.all()
    ]

    prompt = build_generation_prompt(
        topic_name=topic.name,
        topic_description=topic.description,
        language=request.language,
        difficulty=request.difficulty,
        num_problems=request.num_problems,
        num_test_cases=request.num_test_cases,
        test_type=request.test_type,
        custom_instructions=request.custom_instructions,
        existing_problems=existing_problems,
    )

    client = get_openai_client()
    stream = await client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown fences."},
        ],
        temperature=0.7,
        stream=True,
    )

    accumulated = ""
    titles_found: list[str] = []

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        accumulated += delta

        # Detect new problem titles as they appear in the stream
        for match in _TITLE_RE.finditer(accumulated):
            title = match.group(1)
            if title not in titles_found:
                titles_found.append(title)
                yield ("title_found", title)

    yield ("llm_done", accumulated)


async def generate_problems_stream(
    db: AsyncSession,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> AsyncGenerator[str, None]:
    """Yields SSE-formatted events as problems are generated."""
    total = request.num_problems

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    yield sse("status", {"message": f"Generating {total} problems with AI...", "phase": "calling_llm"})

    raw_content = ""
    titles_seen = 0

    try:
        async for event_type, content in _stream_llm_call(db, topic, request):
            if event_type == "title_found":
                titles_seen += 1
                yield sse("status", {
                    "message": f"AI is writing problem {titles_seen}/{total}: {content}",
                    "phase": "calling_llm",
                    "current": titles_seen,
                    "total": total,
                })
            elif event_type == "llm_done":
                raw_content = content
    except Exception as e:
        yield sse("error", {"message": f"LLM call failed: {e}"})
        return

    if not raw_content:
        yield sse("error", {"message": "LLM returned empty response"})
        return

    cleaned = _clean_llm_response(raw_content)
    try:
        raw = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON: %s...", cleaned[:500])
        yield sse("error", {"message": f"LLM returned invalid JSON: {e}"})
        return

    try:
        parsed = LLMResponse.model_validate(raw)
    except Exception as e:
        yield sse("error", {"message": f"Failed to parse LLM response: {e}"})
        return

    actual_count = len(parsed.problems)
    yield sse("status", {"message": f"AI finished! Saving {actual_count} problems...", "phase": "saving"})

    for i, p_data in enumerate(parsed.problems):
        yield sse("status", {
            "message": f"Saving problem {i + 1}/{actual_count}: {p_data.title}",
            "phase": "saving_problem",
            "current": i + 1,
            "total": actual_count,
        })

        try:
            problem = await _save_problem(db, p_data, topic, course_id, user_id, request)
            problem_data = ProblemResponse.model_validate(problem).model_dump(mode="json")
            yield sse("problem_saved", {
                "problem": problem_data,
                "current": i + 1,
                "total": actual_count,
            })
        except Exception as e:
            yield sse("error", {"message": f"Failed to save problem '{p_data.title}': {e}"})
            return

    await db.commit()
    yield sse("done", {"message": f"Successfully generated {actual_count} problems!", "total": actual_count})
