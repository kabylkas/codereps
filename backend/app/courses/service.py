from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.courses.models import Course, CourseEnrollment
from app.problems.models import CourseProblem, Problem
from app.users.models import User


async def create_course(db: AsyncSession, title: str, description: str | None, language: str, owner_id: str) -> Course:
    course = Course(title=title, description=description, language=language, owner_id=owner_id)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


async def get_courses_for_user(db: AsyncSession, user: User) -> list[Course]:
    if user.role == "admin":
        result = await db.execute(select(Course).where(Course.is_active == True))
        return list(result.scalars().all())
    if user.role == "professor":
        result = await db.execute(select(Course).where(Course.owner_id == user.id, Course.is_active == True))
        return list(result.scalars().all())
    # student: enrolled courses
    result = await db.execute(
        select(Course)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .where(CourseEnrollment.user_id == user.id, Course.is_active == True)
    )
    return list(result.scalars().all())


async def get_course_by_id(db: AsyncSession, course_id: str) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()


async def get_course_by_join_code(db: AsyncSession, join_code: str) -> Course | None:
    result = await db.execute(select(Course).where(Course.join_code == join_code))
    return result.scalar_one_or_none()


async def enroll_user(db: AsyncSession, user_id: str, course_id: str, role: str = "student") -> CourseEnrollment:
    enrollment = CourseEnrollment(user_id=user_id, course_id=course_id, role=role)
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def get_enrollment(db: AsyncSession, user_id: str, course_id: str) -> CourseEnrollment | None:
    result = await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
    )
    return result.scalar_one_or_none()


async def get_course_students(db: AsyncSession, course_id: str) -> list[User]:
    result = await db.execute(
        select(User)
        .join(CourseEnrollment, CourseEnrollment.user_id == User.id)
        .where(CourseEnrollment.course_id == course_id, CourseEnrollment.role == "student")
    )
    return list(result.scalars().all())


async def remove_enrollment(db: AsyncSession, user_id: str, course_id: str) -> None:
    enrollment = await get_enrollment(db, user_id, course_id)
    if enrollment:
        await db.delete(enrollment)
        await db.commit()


async def get_course_problems(db: AsyncSession, course_id: str) -> list[Problem]:
    result = await db.execute(
        select(Problem)
        .join(CourseProblem, CourseProblem.problem_id == Problem.id)
        .where(CourseProblem.course_id == course_id)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .order_by(CourseProblem.order_index)
    )
    return list(result.scalars().all())


async def add_problem_to_course(db: AsyncSession, course_id: str, problem_id: str, added_by: str) -> CourseProblem:
    cp = CourseProblem(course_id=course_id, problem_id=problem_id, added_by=added_by)
    db.add(cp)
    await db.commit()
    return cp


async def remove_problem_from_course(db: AsyncSession, course_id: str, problem_id: str) -> None:
    result = await db.execute(
        select(CourseProblem).where(
            CourseProblem.course_id == course_id,
            CourseProblem.problem_id == problem_id,
        )
    )
    cp = result.scalar_one_or_none()
    if cp:
        await db.delete(cp)
        await db.commit()
