from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class TagResponse(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str


class TestCaseCreate(BaseModel):
    test_type: Literal["stdin_stdout", "file_io", "function"]
    input_data: str
    expected_output: str
    metadata_json: str | None = None
    order_index: int = 0
    is_hidden: bool = False


class TestCaseUpdate(BaseModel):
    input_data: str | None = None
    expected_output: str | None = None
    metadata_json: str | None = None
    order_index: int | None = None
    is_hidden: bool | None = None


class TestCaseResponse(BaseModel):
    id: str
    problem_id: str
    test_type: str
    input_data: str
    expected_output: str
    metadata_json: str | None
    order_index: int
    is_hidden: bool

    model_config = {"from_attributes": True}


class ProblemCreate(BaseModel):
    title: str
    description: str
    difficulty: str
    starter_code: str | None = None
    solution_code: str | None = None
    language: str
    tag_ids: list[str] = []


class ProblemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    difficulty: str | None = None
    starter_code: str | None = None
    solution_code: str | None = None
    language: str | None = None
    tag_ids: list[str] | None = None


class ProblemResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    starter_code: str | None
    solution_code: str | None
    language: str
    created_by: str
    is_public: bool
    topic_id: str | None = None
    tags: list[TagResponse] = []
    test_cases: list[TestCaseResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
