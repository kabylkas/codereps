from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./codereps.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    model_problem: str = "google/gemini-2.5-flash-lite"
    model_code: str = "xiaomi/mimo-v2-pro"

    model_config = {"env_file": ".env"}


settings = Settings()
