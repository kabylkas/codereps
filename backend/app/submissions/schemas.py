from datetime import datetime

from pydantic import BaseModel


class SubmitCodeRequest(BaseModel):
    code: str
    language: str


class SubmissionResultResponse(BaseModel):
    id: str
    test_case_id: str
    passed: bool
    actual_output: str | None
    error_message: str | None
    execution_time_ms: int | None

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    id: str
    problem_id: str
    user_id: str
    code: str
    language: str
    status: str
    total_tests: int
    passed_tests: int
    results: list[SubmissionResultResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionSummary(BaseModel):
    id: str
    status: str
    total_tests: int
    passed_tests: int
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}
