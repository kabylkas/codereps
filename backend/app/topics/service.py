from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.topics.models import Topic


async def create_topic(db: AsyncSession, course_id: str, name: str, description: str | None = None, order_index: int = 0) -> Topic:
    topic = Topic(course_id=course_id, name=name, description=description, order_index=order_index)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


async def get_topics_for_course(db: AsyncSession, course_id: str) -> list[Topic]:
    result = await db.execute(
        select(Topic).where(Topic.course_id == course_id).order_by(Topic.order_index)
    )
    return list(result.scalars().all())


async def get_topic_by_id(db: AsyncSession, topic_id: str) -> Topic | None:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    return result.scalar_one_or_none()


async def update_topic(db: AsyncSession, topic: Topic, **kwargs) -> Topic:
    for key, value in kwargs.items():
        if value is not None:
            setattr(topic, key, value)
    await db.commit()
    await db.refresh(topic)
    return topic


async def delete_topic(db: AsyncSession, topic: Topic) -> None:
    await db.delete(topic)
    await db.commit()
