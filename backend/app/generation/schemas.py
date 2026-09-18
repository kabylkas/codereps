from typing import Literal

from pydantic import BaseModel, Field


class GenerationRequest(BaseModel):
    topic_id: str
    num_problems: int = Field(ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard"]
    test_type: Literal["stdin_stdout", "file_io", "function"]
    num_test_cases: int = Field(ge=1, le=20)
    language: str
    custom_instructions: str | None = None


class LLMTestCase(BaseModel):
    input_data: str
    expected_output: str
    metadata_json: str | None = None


class LLMProblem(BaseModel):
    title: str
    description: str
    starter_code: str | None = None
    solution_code: str | None = None
    test_cases: list[LLMTestCase] = []


class LLMResponse(BaseModel):
    problems: list[LLMProblem]
