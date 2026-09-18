from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
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
    problem = await problem_service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if data.language not in ("python", "c"):
        raise HTTPException(status_code=400, detail="Unsupported language. Use 'python' or 'c'.")

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
    if submission.user_id != current_user.id and current_user.role not in ("admin", "professor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    return submission
