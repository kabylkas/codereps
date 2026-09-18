from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_role
from app.users.models import User
from app.courses import service as course_service
from app.topics import service as topic_service
from app.generation import service
from app.generation.schemas import GenerationRequest
from app.problems.schemas import ProblemResponse

router = APIRouter()


@router.post("/generate", response_model=list[ProblemResponse])
async def generate_problems(
    data: GenerationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("professor", "admin")),
):
    topic = await topic_service.get_topic_by_id(db, data.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    course = await course_service.get_course_by_id(db, topic.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        problems = await service.generate_problems(
            db, topic, course.id, current_user.id, data,
        )
        return problems
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {type(e).__name__}: {str(e)}")
