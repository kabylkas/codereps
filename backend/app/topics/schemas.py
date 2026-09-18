from datetime import datetime

from pydantic import BaseModel


class TopicCreate(BaseModel):
    name: str
    description: str | None = None
    order_index: int = 0


class TopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    order_index: int | None = None


class TopicResponse(BaseModel):
    id: str
    course_id: str
    name: str
    description: str | None
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}
