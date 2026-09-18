from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.users.models import User
from app.problems.schemas import (
    ProblemCreate, ProblemUpdate, ProblemResponse,
    TagResponse, TagCreate,
    TestCaseCreate, TestCaseUpdate, TestCaseResponse,
)
from app.problems import service

router = APIRouter()


@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    problem = await service.create_problem(
        db,
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        language=data.language,
        created_by=current_user.id,
        starter_code=data.starter_code,
        solution_code=data.solution_code,
        tag_ids=data.tag_ids,
    )
    # Reload with tags
    problem = await service.get_problem_by_id(db, problem.id)
    return problem


@router.get("", response_model=list[ProblemResponse])
async def list_problems(
    difficulty: str | None = None,
    language: str | None = None,
    tag: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_problems(db, difficulty=difficulty, language=language, tag=tag)


@router.get("/tags", response_model=list[TagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_tags(db)


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    return await service.create_tag(db, data.name)


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    # Hide solution and hidden test cases from students
    if current_user.role == "student":
        problem.solution_code = None
        problem.test_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
    return problem


@router.patch("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: str,
    data: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    updated = await service.update_problem(db, problem, **data.model_dump(exclude_unset=True))
    return updated


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await service.delete_problem(db, problem)


# --- Test Case endpoints ---

@router.get("/{problem_id}/test-cases", response_model=list[TestCaseResponse])
async def list_test_cases(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test_cases = await service.get_test_cases(db, problem_id)
    if current_user.role == "student":
        test_cases = [tc for tc in test_cases if not tc.is_hidden]
    return test_cases


@router.post("/{problem_id}/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case(
    problem_id: str,
    data: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    problem = await service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return await service.create_test_case(
        db, problem_id, data.test_type, data.input_data, data.expected_output,
        data.metadata_json, data.order_index, data.is_hidden,
    )


@router.patch("/{problem_id}/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    problem_id: str,
    test_case_id: str,
    data: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    tc = await service.get_test_case_by_id(db, test_case_id)
    if not tc or tc.problem_id != problem_id:
        raise HTTPException(status_code=404, detail="Test case not found")
    return await service.update_test_case(db, tc, **data.model_dump(exclude_unset=True))


@router.delete("/{problem_id}/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    problem_id: str,
    test_case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    tc = await service.get_test_case_by_id(db, test_case_id)
    if not tc or tc.problem_id != problem_id:
        raise HTTPException(status_code=404, detail="Test case not found")
    await service.delete_test_case(db, tc)
