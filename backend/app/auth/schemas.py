import json

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    position: str | None = None
    interests: list[str] | None = None
    is_active: bool

    model_config = {"from_attributes": True}

    @field_validator("interests", mode="before")
    @classmethod
    def parse_interests(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None
    position: str | None = None
    interests: list[str] | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
