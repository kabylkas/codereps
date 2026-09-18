from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.problems.models import Problem, TestCase
from app.submissions.models import Submission, SubmissionResult
from app.submissions.runner import run_code


async def submit_and_run(
    db: AsyncSession,
    problem: Problem,
    user_id: str,
    code: str,
    language: str,
) -> Submission:
    # Get all test cases for this problem
    result = await db.execute(
        select(TestCase)
        .where(TestCase.problem_id == problem.id)
        .order_by(TestCase.order_index)
    )
    test_cases = list(result.scalars().all())

    # Create submission
    submission = Submission(
        problem_id=problem.id,
        user_id=user_id,
        code=code,
        language=language,
        status="running",
        total_tests=len(test_cases),
    )
    db.add(submission)
    await db.flush()

    if not test_cases:
        submission.status = "passed"
        submission.passed_tests = 0
        await db.commit()
        await db.refresh(submission)
        return submission

    # Run code against test cases
    test_results = await run_code(code, language, test_cases)

    passed_count = 0
    for tr in test_results:
        sr = SubmissionResult(
            submission_id=submission.id,
            test_case_id=tr.test_case_id,
            passed=tr.passed,
            actual_output=tr.actual_output,
            error_message=tr.error_message,
            execution_time_ms=tr.execution_time_ms,
        )
        db.add(sr)
        if tr.passed:
            passed_count += 1

    submission.passed_tests = passed_count
    submission.status = "passed" if passed_count == len(test_cases) else "failed"

    await db.commit()

    # Reload with results
    return await get_submission_by_id(db, submission.id)


async def get_submission_by_id(db: AsyncSession, submission_id: str) -> Submission | None:
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.results))
        .where(Submission.id == submission_id)
    )
    return result.scalar_one_or_none()


async def get_submissions_for_problem(
    db: AsyncSession, problem_id: str, user_id: str
) -> list[Submission]:
    result = await db.execute(
        select(Submission)
        .where(Submission.problem_id == problem_id, Submission.user_id == user_id)
        .order_by(Submission.created_at.desc())
    )
    return list(result.scalars().all())
