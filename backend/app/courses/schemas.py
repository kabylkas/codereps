from datetime import datetime

from pydantic import BaseModel


class CourseCreate(BaseModel):
    title: str
    description: str | None = None
    language: str


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    language: str | None = None


class CourseResponse(BaseModel):
    id: str
    title: str
    description: str | None
    language: str
    join_code: str
    owner_id: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinCourseRequest(BaseModel):
    join_code: str


class AddProblemRequest(BaseModel):
    problem_id: str
