"""Seed script to create initial data for development."""
import asyncio

from sqlalchemy import select

from app.database import async_session_maker, engine, Base
from app.users.models import User
from app.auth.utils import hash_password
from app.problems.models import ProblemTag, TestCase  # noqa: F401
from app.topics.models import Topic  # noqa: F401


async def seed():
    # Import all models so tables exist
    from app.courses.models import Course, CourseEnrollment  # noqa: F401
    from app.problems.models import Problem, CourseProblem  # noqa: F401

    async with async_session_maker() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == "admin@codereps.ai"))
        if result.scalar_one_or_none():
            print("Seed data already exists, skipping.")
            return

        # Create admin
        admin = User(
            email="admin@codereps.ai",
            hashed_password=hash_password("admin123"),
            full_name="Platform Admin",
            role="admin",
        )
        db.add(admin)

        # Create a professor
        prof = User(
            email="professor@codereps.ai",
            hashed_password=hash_password("prof123"),
            full_name="Dr. Smith",
            role="professor",
            position="Professor",
        )
        db.add(prof)

        # Create a student
        student = User(
            email="student@codereps.ai",
            hashed_password=hash_password("student123"),
            full_name="Jane Student",
            role="student",
        )
        db.add(student)

        # Create tags
        tags = ["loops", "conditionals", "functions", "arrays", "strings", "recursion", "sorting", "oop"]
        tag_objects = []
        for name in tags:
            tag = ProblemTag(name=name)
            db.add(tag)
            tag_objects.append(tag)

        await db.commit()
        print("Seed data created successfully!")
        print("  Admin:     admin@codereps.ai / admin123")
        print("  Professor: professor@codereps.ai / prof123")
        print("  Student:   student@codereps.ai / student123")


if __name__ == "__main__":
    asyncio.run(seed())
