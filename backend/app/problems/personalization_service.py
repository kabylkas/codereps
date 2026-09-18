import asyncio
import json
import logging
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_maker
from app.generation.llm_client import get_openai_client
from app.generation.prompts import PERSONALIZE_SYSTEM_PROMPT, build_personalize_prompt
from app.problems.models import PersonalizedProblem, Problem, CourseProblem
from app.users.models import User
from app.courses.models import CourseEnrollment

logger = logging.getLogger(__name__)


def _clean_llm_response(raw_content: str) -> str:
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return cleaned


async def _call_personalize_llm(system_prompt: str, user_prompt: str) -> str:
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.model_problem,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown fences."},
        ],
        temperature=0.8,
    )
    raw = response.choices[0].message.content
    if not raw:
        raise ValueError("LLM returned empty response for personalization")
    return _clean_llm_response(raw)


def _parse_interests(user: User) -> list[str]:
    if user.interests:
        try:
            return json.loads(user.interests)
        except (json.JSONDecodeError, TypeError):
            pass
    return []


async def create_slots_for_enrollment(db: AsyncSession, user_id: str, course_id: str) -> list[PersonalizedProblem]:
    """Create PersonalizedProblem slots for all problems in a course when a student enrolls.
    Returns the created slots. LLM generation is triggered in background."""
    # Get all problems in the course
    result = await db.execute(
        select(Problem)
        .join(CourseProblem, CourseProblem.problem_id == Problem.id)
        .where(CourseProblem.course_id == course_id)
    )
    problems = list(result.scalars().all())

    if not problems:
        return []

    # Check which ones already have slots (shouldn't happen but be safe)
    existing_result = await db.execute(
        select(PersonalizedProblem.problem_id).where(
            PersonalizedProblem.user_id == user_id,
            PersonalizedProblem.problem_id.in_([p.id for p in problems]),
        )
    )
    existing_problem_ids = set(existing_result.scalars().all())

    slots = []
    for problem in problems:
        if problem.id in existing_problem_ids:
            continue
        seed = random.randint(1, 100000)
        slot = PersonalizedProblem(
            problem_id=problem.id,
            user_id=user_id,
            seed=seed,
            status="pending",
        )
        db.add(slot)
        slots.append(slot)

    if slots:
        await db.commit()

    # Trigger background generation
    if slots:
        asyncio.create_task(_generate_all_in_background(user_id, [s.id for s in slots]))

    return slots


async def create_slots_for_new_problem(db: AsyncSession, course_id: str, problem_id: str) -> list[PersonalizedProblem]:
    """Create PersonalizedProblem slots for all enrolled students when a new problem is added to a course."""
    # Get all enrolled students
    result = await db.execute(
        select(CourseEnrollment.user_id).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.role == "student",
        )
    )
    student_ids = list(result.scalars().all())

    if not student_ids:
        return []

    # Check which students already have slots
    existing_result = await db.execute(
        select(PersonalizedProblem.user_id).where(
            PersonalizedProblem.problem_id == problem_id,
            PersonalizedProblem.user_id.in_(student_ids),
        )
    )
    existing_user_ids = set(existing_result.scalars().all())

    slots = []
    for student_id in student_ids:
        if student_id in existing_user_ids:
            continue
        seed = random.randint(1, 100000)
        slot = PersonalizedProblem(
            problem_id=problem_id,
            user_id=student_id,
            seed=seed,
            status="pending",
        )
        db.add(slot)
        slots.append(slot)

    if slots:
        await db.commit()

    # Trigger background generation
    if slots:
        asyncio.create_task(_generate_all_in_background_multi(problem_id, [s.id for s in slots]))

    return slots


async def _generate_all_in_background(user_id: str, slot_ids: list[str]):
    """Background task: generate personalized content for all given slots."""
    async with async_session_maker() as db:
        # Load user
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return

        interests = _parse_interests(user)
        student_name = user.full_name or "Student"

        for slot_id in slot_ids:
            try:
                await _generate_single_slot(db, slot_id, student_name, interests)
            except Exception:
                logger.exception("Failed to generate personalized problem for slot %s", slot_id)


async def _generate_all_in_background_multi(problem_id: str, slot_ids: list[str]):
    """Background task: generate personalized content for multiple students for one problem."""
    async with async_session_maker() as db:
        for slot_id in slot_ids:
            try:
                # Load slot with user
                slot_result = await db.execute(
                    select(PersonalizedProblem).where(PersonalizedProblem.id == slot_id)
                )
                slot = slot_result.scalar_one_or_none()
                if not slot or slot.status != "pending":
                    continue

                user_result = await db.execute(select(User).where(User.id == slot.user_id))
                user = user_result.scalar_one_or_none()
                if not user:
                    continue

                interests = _parse_interests(user)
                student_name = user.full_name or "Student"
                await _generate_single_slot(db, slot_id, student_name, interests)
            except Exception:
                logger.exception("Failed to generate personalized problem for slot %s", slot_id)


async def _generate_single_slot(db: AsyncSession, slot_id: str, student_name: str, interests: list[str]):
    """Generate personalized content for a single slot."""
    slot_result = await db.execute(
        select(PersonalizedProblem).where(PersonalizedProblem.id == slot_id)
    )
    slot = slot_result.scalar_one_or_none()
    if not slot or slot.status not in ("pending", "failed"):
        return

    # Load original problem
    problem_result = await db.execute(select(Problem).where(Problem.id == slot.problem_id))
    problem = problem_result.scalar_one_or_none()
    if not problem:
        return

    slot.status = "generating"
    await db.commit()

    try:
        prompt = build_personalize_prompt(
            original_title=problem.title,
            original_description=problem.description,
            student_name=student_name,
            interests=interests,
            seed=slot.seed,
        )

        raw = await _call_personalize_llm(PERSONALIZE_SYSTEM_PROMPT, prompt)
        parsed = json.loads(raw)

        slot.title = parsed["title"]
        slot.description = parsed["description"]
        slot.status = "ready"
        await db.commit()
        logger.info("Personalized problem ready: slot=%s problem=%s", slot_id, problem.title)
    except Exception as e:
        logger.exception("Personalization failed for slot %s", slot_id)
        slot.status = "failed"
        await db.commit()
        raise


async def get_or_create_personalized(
    db: AsyncSession,
    problem: Problem,
    user: User,
) -> PersonalizedProblem:
    """Return cached personalized problem, or create slot and generate on the fly.

    Concurrency: relies on the (problem_id, user_id) unique constraint to break ties.
    Two concurrent callers will both attempt to insert; the loser catches IntegrityError,
    re-fetches, and waits for the winner's slot to reach a terminal state.
    """
    from sqlalchemy.exc import IntegrityError

    async def _fetch_slot() -> PersonalizedProblem | None:
        result = await db.execute(
            select(PersonalizedProblem).where(
                PersonalizedProblem.problem_id == problem.id,
                PersonalizedProblem.user_id == user.id,
            )
        )
        return result.scalar_one_or_none()

    async def _wait_until_terminal(slot: PersonalizedProblem) -> PersonalizedProblem:
        """Poll until slot reaches ready/failed. Does not mutate the slot."""
        for _ in range(30):  # up to 30s of polling
            await db.refresh(slot)
            if slot.status in ("ready", "failed"):
                return slot
            await asyncio.sleep(1)
        return slot

    existing = await _fetch_slot()
    if existing:
        if existing.status == "ready":
            return existing
        if existing.status == "generating":
            return await _wait_until_terminal(existing)
        # pending or failed — generate inline
        interests = _parse_interests(user)
        await _generate_single_slot(db, existing.id, user.full_name or "Student", interests)
        await db.refresh(existing)
        return existing

    # No slot exists — try to insert. On race, the unique constraint wins.
    seed = random.randint(1, 100000)
    slot = PersonalizedProblem(
        problem_id=problem.id,
        user_id=user.id,
        seed=seed,
        status="pending",
    )
    db.add(slot)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        winner = await _fetch_slot()
        if winner is None:
            # Shouldn't happen — constraint fired but row is gone — surface clearly
            raise
        if winner.status == "ready":
            return winner
        return await _wait_until_terminal(winner)

    await db.refresh(slot)
    interests = _parse_interests(user)
    await _generate_single_slot(db, slot.id, user.full_name or "Student", interests)
    await db.refresh(slot)
    return slot


async def get_student_problems_for_course(
    db: AsyncSession,
    user_id: str,
    course_id: str,
    topic_id: str | None = None,
) -> list[dict]:
    """Get all personalized problems for a student in a course."""
    from sqlalchemy.orm import selectinload

    query = (
        select(PersonalizedProblem, Problem)
        .join(Problem, Problem.id == PersonalizedProblem.problem_id)
        .join(CourseProblem, CourseProblem.problem_id == Problem.id)
        .where(
            PersonalizedProblem.user_id == user_id,
            CourseProblem.course_id == course_id,
        )
        .order_by(CourseProblem.order_index)
    )

    if topic_id:
        query = query.where(Problem.topic_id == topic_id)

    result = await db.execute(query)
    rows = result.all()

    problems = []
    for personalized, problem in rows:
        problems.append({
            "id": personalized.id,
            "problem_id": problem.id,
            "title": personalized.title,
            "description": personalized.description,
            "status": personalized.status,
            "difficulty": problem.difficulty,
            "language": problem.language,
            "topic_id": problem.topic_id,
        })

    return problems
