import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.config import settings
from app.generation.llm_client import get_openai_client
from app.generation.prompts import SYSTEM_PROMPT, build_generation_prompt
from app.generation.schemas import GenerationRequest, LLMResponse
from app.problems.models import Problem, TestCase, CourseProblem
from app.topics.models import Topic

logger = logging.getLogger(__name__)


async def generate_problems(
    db: AsyncSession,
    topic: Topic,
    course_id: str,
    user_id: str,
    request: GenerationRequest,
) -> list[Problem]:
    # Fetch existing problem titles and descriptions for this topic
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

    # Strip markdown fences if present
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        raw = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON: %s...", cleaned[:500])
        raise ValueError(f"LLM returned invalid JSON: {e}")

    parsed = LLMResponse.model_validate(raw)

    problems = []
    for p_data in parsed.problems:
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
        problems.append(problem)

    await db.commit()

    # Reload with relationships
    loaded = []
    for p in problems:
        result = await db.execute(
            select(Problem)
            .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
            .where(Problem.id == p.id)
        )
        loaded.append(result.scalar_one())

    return loaded
