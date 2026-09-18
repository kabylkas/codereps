from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.courses.models import Course, CourseEnrollment
from app.database import async_session_maker
from app.problems.models import CourseProblem, Problem
from app.users.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: str):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return dependency


async def assert_course_member(db: AsyncSession, user: User, course: Course) -> None:
    """Allow if admin, course owner, or an enrolled student."""
    if user.role == "admin" or course.owner_id == user.id:
        return
    enrollment = await db.execute(
        select(CourseEnrollment.id).where(
            CourseEnrollment.user_id == user.id,
            CourseEnrollment.course_id == course.id,
        )
    )
    if enrollment.first() is None:
        raise HTTPException(status_code=403, detail="Not a member of this course")


async def assert_problem_visible_to(db: AsyncSession, user: User, problem: Problem) -> None:
    """Allow if admin, problem author, or enrolled in any course containing the problem."""
    if user.role == "admin" or problem.created_by == user.id:
        return
    result = await db.execute(
        select(CourseEnrollment.course_id)
        .join(CourseProblem, CourseProblem.course_id == CourseEnrollment.course_id)
        .where(
            CourseEnrollment.user_id == user.id,
            CourseProblem.problem_id == problem.id,
        )
    )
    if result.first() is None:
        raise HTTPException(status_code=403, detail="Not authorized for this problem")
