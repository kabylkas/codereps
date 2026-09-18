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

### Prerequisites

- **Python 3.12** and [`uv`](https://docs.astral.sh/uv/)
- **Node 20+** and npm
- **Docker** — required. Student submissions execute inside ephemeral containers;
  without a running Docker daemon every submission fails with a runner error.

### 1. Backend

```bash
cd backend
uv sync
cp .env.example .env
# SECRET_KEY is mandatory — the app refuses to boot with the placeholder value:
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'   # paste into .env
```

Set `OPENROUTER_API_KEY` in `.env`. It is needed for AI problem generation and
for per-student personalization — and personalization runs when a **student
opens a problem**, so without a key the student solve page fails with a 500.
Course, topic, and problem authoring, plus submission and grading via the API,
all work without a key; the student-facing loop does not.

```bash
uv run alembic upgrade head    # create / migrate the database
uv run python seed.py          # demo admin, professor, student + starter tags
uv run uvicorn app.main:app --reload
```

API on `http://localhost:8000`, interactive docs at `/docs`.

### 2. Submission sandbox image

Build once (and after any change to `Dockerfile.runner`):

```bash
cd backend
docker build -f Dockerfile.runner -t codereps-runner .
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App on `http://localhost:5173`. It talks to `http://localhost:8000/api` by
default; override with `VITE_API_URL`.

### Demo accounts

Created by `seed.py`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@codereps.ai` | `admin123` |
| Professor | `professor@codereps.ai` | `prof123` |
| Student | `student@codereps.ai` | `student123` |

### Troubleshooting

**Login fails with no error detail.** Docker Desktop binds `*:8000` on IPv6, and
macOS resolves `localhost` to `::1` before `127.0.0.1` — so `localhost:8000`
reaches Docker's API server (which 404s without CORS headers) instead of
uvicorn, which listens on IPv4 only. The frontend defaults to
`http://127.0.0.1:8000/api` for this reason. If you override `VITE_API_URL`, use
the IPv4 literal, not `localhost`. To confirm who holds the port:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

**Every submission fails with a runner error.** The sandbox image is missing or
the Docker daemon is stopped. Rebuild with the command in step 2 and check
`docker info`.

**Backend exits on startup with a `SECRET_KEY` message.** `.env` is missing or
still holds the placeholder. See step 1.

### Walking the happy path

1. Sign in as the professor → **Courses → Create Course** (pick `python`).
2. Open the course, add a **Topic**, then either generate problems with AI
   (needs `OPENROUTER_API_KEY`) or hand-author one in **Problem Studio** and
   add it to the course. Give it at least one test case.
3. Copy the course **join code**.
4. Sign in as the student → **Courses → Join** with that code, then open
   **My Problems** and solve one.

## MVP Scope

Role-based access, course creation, problem curation through the design studio, student practice, exam configuration, and structured feedback. The focus is on validating the model in real classroom settings.

## License

TBD
