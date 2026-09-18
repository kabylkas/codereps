from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.users.models import User
from app.problems.schemas import (
    ProblemCreate, ProblemUpdate, ProblemResponse,
    TagResponse, TagCreate,
    TestCaseCreate, TestCaseUpdate, TestCaseResponse,
    PersonalizedProblemResponse,
)
from app.problems import service
from app.problems import personalization_service

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
    topic_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_problems(db, difficulty=difficulty, language=language, tag=tag, topic_id=topic_id)


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


@router.get("/{problem_id}/personalized", response_model=PersonalizedProblemResponse)
async def get_personalized_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a personalized version of the problem for the current student."""
    problem = await service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Non-students get the original problem back (no personalization)
    if current_user.role != "student":
        return PersonalizedProblemResponse(
            id=problem.id,
            title=problem.title,
            description=problem.description,
            difficulty=problem.difficulty,
            starter_code=problem.starter_code,
            solution_code=problem.solution_code,
            language=problem.language,
            created_by=problem.created_by,
            is_public=problem.is_public,
            topic_id=problem.topic_id,
            tags=[{"id": t.id, "name": t.name} for t in problem.tags],
            test_cases=[tc for tc in problem.test_cases],
            created_at=problem.created_at,
            is_personalized=False,
        )

    # Students: get or generate personalized version
    personalized = await personalization_service.get_or_create_personalized(
        db, problem, current_user,
    )

    # Hide solution and hidden test cases
    return PersonalizedProblemResponse(
        id=problem.id,
        title=personalized.title,
        description=personalized.description,
        difficulty=problem.difficulty,
        starter_code=problem.starter_code,
        solution_code=None,
        language=problem.language,
        created_by=problem.created_by,
        is_public=problem.is_public,
        topic_id=problem.topic_id,
        tags=[{"id": t.id, "name": t.name} for t in problem.tags],
        test_cases=[tc for tc in problem.test_cases if not tc.is_hidden],
        created_at=problem.created_at,
        is_personalized=True,
    )


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
