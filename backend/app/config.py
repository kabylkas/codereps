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
    # Comma-separated list of origins allowed by CORS. Defaults cover local dev;
    # set explicitly in production (e.g. the deployed frontend's URL).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Submission grading shells out to `docker run` and needs a real Docker
    # daemon (see app/submissions/runner.py). PaaS web services (Render,
    # Railway, Heroku, ...) don't expose one, so this is a hard off-switch:
    # when False, /submit returns 503 instead of failing on a missing `docker`
    # binary. Flip back on once grading is wired to something PaaS-reachable.
    code_execution_enabled: bool = True

    model_config = {"env_file": ".env"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

# Render (and most hosted Postgres providers) hand out `postgres://` or
# `postgresql://` connection strings with no driver suffix. SQLAlchemy's async
# engine needs the asyncpg dialect spelled out explicitly.
if settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif settings.database_url.startswith("postgresql://"):
    settings.database_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if settings.secret_key == "change-me-in-production" or not settings.secret_key:
    raise RuntimeError(
        "SECRET_KEY must be set in .env to a strong random value. "
        "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
    )
