# codereps.ai

A platform for learning programming through repeated coding — using Gen AI *against* students.

## Overview

Many universities respond to generative AI by creating policies that restrict or ban its use. This is a losing battle. AI is here to stay, and policies that fight it head-on only create an arms race between students and institutions. Instead, we should embrace AI and rethink the methodologies we use to teach programming so that this powerful tool works in favor of learning, not against it.

Every professor knows that the more students code, the better they get. The traditional way to force students to write code was through assignments — but there has always been resistance to assigning more problems because it becomes impractical to grade them all. This creates a ceiling on how much practice students actually get.

codereps.ai breaks through that ceiling by using AI to scale the problem pipeline. The platform gives students a large, visible pool of practice problems and tells them: these are the kinds of problems you will see on your exam. The objective is clear. Students have a concrete foundation around which they can practice, ask targeted questions, and build real skill. They are motivated to code because they know exactly what to prepare for — and the only way to prepare is to actually write code.

Exams are drawn from the curated problem pool in a controlled environment, so real understanding is required to succeed. Meanwhile, professors manage courses efficiently with AI-assisted tooling for problem creation, performance analysis, and feedback generation. The AI does the heavy lifting on scaling — professors stay in control of the curriculum.

## Key Concepts

- **Problem Design Studio** — Professors curate and refine a living repository of problems, organized by topic and difficulty. AI assists with generating variations and expanding coverage, but professors review and approve all content.
- **Practice-First Learning** — Students see the full problem pool and practice by solving problems with multiple attempts. The pool is large and varied enough that memorization alone is insufficient.
- **Controlled Assessments** — Exams are the primary measure of performance, generated from the curated problem pool with variation to ensure fairness. This reduces the value of cheating without relying on post-hoc detection.
- **AI-Assisted Feedback** — After assessments, the system analyzes performance, identifies patterns of misunderstanding, and generates structured feedback for students and class-wide insights for instructors.

## Roles

- **Professors** — Create courses, curate problem pools, configure exams, and monitor student progress through aggregated insights.
- **Students** — Practice coding through repetition, take controlled exams, and receive structured feedback.
- **Administrators** — Manage institutional-level access and oversee courses across departments.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, SQLAlchemy, Alembic, SQLite (aiosqlite)
- **Auth**: bcrypt, python-jose (JWT)

## Project Structure

```
backend/       # FastAPI application
  app/         # Application code
  alembic/     # Database migrations
frontend/      # React SPA
  src/         # Application source
  public/      # Static assets
```

## Getting Started

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## MVP Scope

Role-based access, course creation, problem curation through the design studio, student practice, exam configuration, and structured feedback. The focus is on validating the model in real classroom settings.

## License

TBD
