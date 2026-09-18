from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.users.models import User
from app.auth.schemas import UserResponse
from app.courses.schemas import CourseCreate, CourseUpdate, CourseResponse, JoinCourseRequest, AddProblemRequest
from app.courses import service
from app.problems.schemas import ProblemResponse

router = APIRouter()


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    course = await service.create_course(db, data.title, data.description, data.language, current_user.id)
    return course


@router.get("", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_courses_for_user(db, current_user)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    data: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    course.is_active = False
    await db.commit()


@router.post("/join", status_code=status.HTTP_200_OK)
async def join_course(
    data: JoinCourseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_join_code(db, data.join_code)
    if not course or not course.is_active:
        raise HTTPException(status_code=404, detail="Invalid join code")
    existing = await service.get_enrollment(db, current_user.id, course.id)
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    await service.enroll_user(db, current_user.id, course.id)
    return {"detail": "Enrolled successfully"}


@router.get("/{course_id}/students", response_model=list[UserResponse])
async def get_students(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    return await service.get_course_students(db, course_id)


@router.delete("/{course_id}/students/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student(
    course_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await service.remove_enrollment(db, user_id, course_id)


@router.get("/{course_id}/problems", response_model=list[ProblemResponse])
async def get_course_problems(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_course_problems(db, course_id)


@router.post("/{course_id}/problems", status_code=status.HTTP_201_CREATED)
async def add_problem(
    course_id: str,
    data: AddProblemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    course = await service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await service.add_problem_to_course(db, course_id, data.problem_id, current_user.id)
    return {"detail": "Problem added"}


@router.delete("/{course_id}/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_problem(
    course_id: str,
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    await service.remove_problem_from_course(db, course_id, problem_id)
