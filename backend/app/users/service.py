from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User


async def get_users(db: AsyncSession, role: str | None = None) -> list[User]:
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
