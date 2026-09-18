from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.problems.models import Problem, ProblemTag, TestCase, problem_tag_association


async def create_problem(
    db: AsyncSession,
    title: str,
    description: str,
    difficulty: str,
    language: str,
    created_by: str,
    starter_code: str | None = None,
    solution_code: str | None = None,
    tag_ids: list[str] | None = None,
) -> Problem:
    problem = Problem(
        title=title,
        description=description,
        difficulty=difficulty,
        language=language,
        created_by=created_by,
        starter_code=starter_code,
        solution_code=solution_code,
    )
    if tag_ids:
        result = await db.execute(select(ProblemTag).where(ProblemTag.id.in_(tag_ids)))
        problem.tags = list(result.scalars().all())
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem


async def get_problems(
    db: AsyncSession,
    difficulty: str | None = None,
    language: str | None = None,
    tag: str | None = None,
) -> list[Problem]:
    query = select(Problem).options(selectinload(Problem.tags), selectinload(Problem.test_cases))
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if language:
        query = query.where(Problem.language == language)
    if tag:
        query = query.join(problem_tag_association).join(ProblemTag).where(ProblemTag.name == tag)
    query = query.order_by(Problem.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_problem_by_id(db: AsyncSession, problem_id: str) -> Problem | None:
    result = await db.execute(
        select(Problem).options(selectinload(Problem.tags), selectinload(Problem.test_cases)).where(Problem.id == problem_id)
    )
    return result.scalar_one_or_none()


async def update_problem(
    db: AsyncSession,
    problem: Problem,
    title: str | None = None,
    description: str | None = None,
    difficulty: str | None = None,
    starter_code: str | None = None,
    solution_code: str | None = None,
    language: str | None = None,
    tag_ids: list[str] | None = None,
) -> Problem:
    if title is not None:
        problem.title = title
    if description is not None:
        problem.description = description
    if difficulty is not None:
        problem.difficulty = difficulty
    if starter_code is not None:
        problem.starter_code = starter_code
    if solution_code is not None:
        problem.solution_code = solution_code
    if language is not None:
        problem.language = language
    if tag_ids is not None:
        result = await db.execute(select(ProblemTag).where(ProblemTag.id.in_(tag_ids)))
        problem.tags = list(result.scalars().all())
    await db.commit()
    await db.refresh(problem)
    return problem


async def delete_problem(db: AsyncSession, problem: Problem) -> None:
    await db.delete(problem)
    await db.commit()


async def get_tags(db: AsyncSession) -> list[ProblemTag]:
    result = await db.execute(select(ProblemTag).order_by(ProblemTag.name))
    return list(result.scalars().all())


async def create_tag(db: AsyncSession, name: str) -> ProblemTag:
    tag = ProblemTag(name=name)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


async def get_test_cases(db: AsyncSession, problem_id: str) -> list[TestCase]:
    result = await db.execute(
        select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.order_index)
    )
    return list(result.scalars().all())


async def create_test_case(
    db: AsyncSession,
    problem_id: str,
    test_type: str,
    input_data: str,
    expected_output: str,
    metadata_json: str | None = None,
    order_index: int = 0,
    is_hidden: bool = False,
) -> TestCase:
    tc = TestCase(
        problem_id=problem_id,
        test_type=test_type,
        input_data=input_data,
        expected_output=expected_output,
        metadata_json=metadata_json,
        order_index=order_index,
        is_hidden=is_hidden,
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc


async def get_test_case_by_id(db: AsyncSession, test_case_id: str) -> TestCase | None:
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    return result.scalar_one_or_none()


async def update_test_case(db: AsyncSession, tc: TestCase, **kwargs) -> TestCase:
    for key, value in kwargs.items():
        if value is not None:
            setattr(tc, key, value)
    await db.commit()
    await db.refresh(tc)
    return tc


async def delete_test_case(db: AsyncSession, tc: TestCase) -> None:
    await db.delete(tc)
    await db.commit()
