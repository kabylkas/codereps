import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id: Mapped[str] = mapped_column(String(36), ForeignKey("problems.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    passed_tests: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    problem = relationship("Problem")
    user = relationship("User")
    results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    test_case_id: Mapped[str] = mapped_column(String(36), ForeignKey("test_cases.id"), nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    actual_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    submission = relationship("Submission", back_populates="results")
    test_case = relationship("TestCase")
