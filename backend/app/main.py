from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.courses.router import router as courses_router
from app.problems.router import router as problems_router
from app.topics.router import router as topics_router
from app.generation.router import router as generation_router
from app.submissions.router import router as submissions_router

app = FastAPI(title="codereps.ai", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(courses_router, prefix="/api/courses", tags=["courses"])
app.include_router(problems_router, prefix="/api/problems", tags=["problems"])
app.include_router(topics_router, prefix="/api/courses/{course_id}/topics", tags=["topics"])
app.include_router(generation_router, prefix="/api/generation", tags=["generation"])
app.include_router(submissions_router, prefix="/api", tags=["submissions"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
