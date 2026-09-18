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


# Step 1: Problem statements from Gemini
class LLMProblemStatement(BaseModel):
    title: str
    description: str
    starter_code: str | None = None


class LLMProblemStatementsResponse(BaseModel):
    problems: list[LLMProblemStatement]


# Step 2: Solution from Mimo
class LLMSolutionResponse(BaseModel):
    solution_code: str


# Step 3: Test inputs from Mimo (expected outputs come from execution)
class LLMTestInputsResponse(BaseModel):
    inputs: list[str]
