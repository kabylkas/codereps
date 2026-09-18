from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, require_role
from app.users.models import User
from app.courses import service as course_service
from app.topics import service
from app.topics.schemas import TopicCreate, TopicUpdate, TopicResponse

router = APIRouter()


async def _get_course_or_404(course_id: str, db: AsyncSession):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    course_id: str,
    data: TopicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    course = await _get_course_or_404(course_id, db)
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    return await service.create_topic(db, course_id, data.name, data.description, data.order_index)


@router.get("", response_model=list[TopicResponse])
async def list_topics(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_course_or_404(course_id, db)
    return await service.get_topics_for_course(db, course_id)


@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    course_id: str,
    topic_id: str,
    data: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    course = await _get_course_or_404(course_id, db)
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    topic = await service.get_topic_by_id(db, topic_id)
    if not topic or topic.course_id != course_id:
        raise HTTPException(status_code=404, detail="Topic not found")
    return await service.update_topic(db, topic, **data.model_dump(exclude_unset=True))


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    course_id: str,
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    course = await _get_course_or_404(course_id, db)
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    topic = await service.get_topic_by_id(db, topic_id)
    if not topic or topic.course_id != course_id:
        raise HTTPException(status_code=404, detail="Topic not found")
    await service.delete_topic(db, topic)
