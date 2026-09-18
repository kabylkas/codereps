import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text, Boolean, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

problem_tag_association = Table(
    "problem_tag_association",
    Base.metadata,
    Column("problem_id", String(36), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("problem_tags.id", ondelete="CASCADE"), primary_key=True),
)


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    topic_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="created_problems")
    topic = relationship("Topic")
    tags = relationship("ProblemTag", secondary=problem_tag_association, back_populates="problems")
    course_problems = relationship("CourseProblem", back_populates="problem", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")


class ProblemTag(Base):
    __tablename__ = "problem_tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    problems = relationship("Problem", secondary=problem_tag_association, back_populates="tags")


class CourseProblem(Base):
    __tablename__ = "course_problems"
    __table_args__ = (UniqueConstraint("course_id", "problem_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    problem_id: Mapped[str] = mapped_column(String(36), ForeignKey("problems.id"), nullable=False)
    added_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    course = relationship("Course", back_populates="course_problems")
    problem = relationship("Problem", back_populates="course_problems")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id: Mapped[str] = mapped_column(String(36), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    test_type: Mapped[str] = mapped_column(String(20), nullable=False)
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    problem = relationship("Problem", back_populates="test_cases")
