from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_current_user, assert_problem_visible_to
from app.users.models import User
from app.problems import service as problem_service
from app.submissions import service
from app.submissions.schemas import SubmitCodeRequest, SubmissionResponse, SubmissionSummary

router = APIRouter()


@router.post("/problems/{problem_id}/submit", response_model=SubmissionResponse)
async def submit_code(
    problem_id: str,
    data: SubmitCodeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.code_execution_enabled:
        # Grading needs a real Docker daemon (app/submissions/runner.py shells
        # out to `docker run`), which this deployment doesn't have. Fail
        # clearly and immediately rather than letting the subprocess spawn
        # fail with a confusing "docker: not found" 500 further down.
        raise HTTPException(
            status_code=503,
            detail="Code execution isn't available on this deployment yet — coming soon.",
        )

    problem = await problem_service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    await assert_problem_visible_to(db, current_user, problem)

    if data.language not in ("python", "c"):
        raise HTTPException(status_code=400, detail="Unsupported language. Use 'python' or 'c'.")
    if data.language != problem.language:
        raise HTTPException(
            status_code=400,
            detail=f"Problem requires {problem.language}, got {data.language}",
        )

    submission = await service.submit_and_run(
        db, problem, current_user.id, data.code, data.language,
    )
    return submission


@router.get("/problems/{problem_id}/submissions", response_model=list[SubmissionSummary])
async def list_submissions(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await problem_service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    await assert_problem_visible_to(db, current_user, problem)
    return await service.get_submissions_for_problem(db, problem_id, current_user.id)


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = await service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.user_id == current_user.id or current_user.role == "admin":
        return submission
    # Professors can see submissions only for problems they authored
    problem = await problem_service.get_problem_by_id(db, submission.problem_id)
    if current_user.role == "professor" and problem and problem.created_by == current_user.id:
        return submission
    raise HTTPException(status_code=403, detail="Not allowed")
