# AGENTS.md

Operating notes for AI coding agents working in this repository. Read this before changing code.

For product intent see [README.md](README.md). For the current architectural assessment, known
defects, and the recommended work order see [REVIEW.md](REVIEW.md) — check it before proposing work,
since several obvious-looking "bugs" are already catalogued there with a chosen fix.

---

## What this is

A platform for teaching programming through repetition. Professors curate a pool of problems (with
LLM assistance), each student sees a *personalized reskin* of every problem, and student code is
graded by executing it against test cases inside a Docker sandbox.

Two roles do real work — professor (authors courses, topics, problems) and student (practices,
submits) — plus an admin role that is backend-only today.

**Supported languages:** `python` and `c`. Nothing else executes; adding a third means teaching
`submissions/runner.py` about it.

**Test case types:** `stdin_stdout`, `file_io`, `function`. The last one carries an `assertion_code`
string in `metadata_json`.

---

## Layout

```
backend/
  app/
    <domain>/           auth, users, courses, topics, problems, submissions, generation
      router.py         FastAPI routes — HTTP concerns, authorization, response shaping
      service.py        DB queries and business logic — takes an AsyncSession, returns models
      schemas.py        Pydantic request/response models
      models.py         SQLAlchemy ORM models
    config.py           pydantic-settings; reads backend/.env
    database.py         async engine + session maker + declarative Base
    dependencies.py     get_db, get_current_user, require_role, authorization assertions
    main.py             app assembly, router mounting, CORS
  alembic/versions/     migrations (linear chain, single head)
  Dockerfile.runner     image used to execute student code
  seed.py               demo users and tags
frontend/
  src/
    api/                one axios module per backend domain
    pages/              route components
    components/         layout + shared UI
    context/            AuthProvider (AuthContext.tsx) and useAuth hook (useAuth.ts)
    types/              shared TS types mirroring backend schemas
landing/index.html      standalone marketing page, unrelated to the SPA
```

Every backend domain follows the same four-file shape. Match it when adding one; don't invent a new
layering.

---

## Commands

```bash
# Backend — from backend/
uv sync                              # install
uv run alembic upgrade head          # migrate
uv run python seed.py                # demo data (idempotent; no-ops if admin exists)
uv run uvicorn app.main:app --reload # serve on :8000, docs at /docs
docker build -f Dockerfile.runner -t codereps-runner .   # REQUIRED before any submission works

# Frontend — from frontend/
npm install
npm run dev      # :5173
npm run build    # tsc -b && vite build
npm run lint
npx tsc -b       # typecheck alone
```

There is **no test suite**. Verify changes by exercising the API directly (`curl` against
`127.0.0.1:8000`, log in as a seeded user to get a bearer token) or by driving the UI. If you add
tests, `pytest` + `httpx.AsyncClient` with a fixture per role is the shape to reach for — it is
step 2 of the plan in REVIEW.md.

---

## Environment

`backend/.env` is required — `config.py` **raises on import** if `SECRET_KEY` is missing or still
the placeholder. Copy `backend/.env.example` and generate one:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

`OPENROUTER_API_KEY` is optional. Without it, AI problem generation and student personalization
fail; everything else (courses, topics, hand-authored problems, submission, grading) works. Prefer
building and testing against hand-authored problems so you are not burning tokens or waiting on a
model.

Models are configured, not hardcoded: `MODEL_PROBLEM` for statements and personalization,
`MODEL_CODE` for solutions and test inputs. They are reached through an OpenAI-compatible client
pointed at OpenRouter (`generation/llm_client.py`).

Never commit `.env` or `*.db`; both are gitignored.

---

## Conventions that matter

**Async all the way down.** Every route, service function, and DB call is `async`. The engine is
`aiosqlite`. Do not introduce a blocking call into a request path — that includes `subprocess.run`,
`requests`, and `time.sleep`.

**Services take the session, routers own the HTTP.** Business logic lives in `service.py` and
receives `db: AsyncSession`. Routers do authorization, raise `HTTPException`, and shape responses.
Keep `HTTPException` out of services.

**Eager-load relationships you will serialize.** `expire_on_commit=False` is set, but lazy loads
still fail under async. Use `selectinload` (see `problems/service.py:get_problem_by_id`) whenever a
response includes `tags` or `test_cases`.

**IDs are `str(uuid4())` in `String(36)` columns**, defaulted in the model. Don't switch to integers
or to server-side generation.

**Timestamps** use `server_default=func.now()` and `onupdate=func.now()`.

**Frontend mirrors the backend by hand.** `src/types/` duplicates the Pydantic schemas — when you
change a response model, update the matching type and the `src/api/` module together. There is no
codegen.

**Styling is Tailwind v4 with the theme in `src/index.css`** under `@theme`. Use the semantic tokens
(`bg-surface`, `text-text-secondary`, `text-lime`, `border-border-subtle`, `text-error`) rather than
raw palette values. Note `--color-lime` is a deep forest green, not a lime.

**`AuthContext.tsx` must export only `AuthProvider`.** The `useAuth` hook and the context object
live in `context/useAuth.ts`. Mixing component and non-component exports in one file breaks React
Fast Refresh — it invalidates instead of hot-reloading, remounts consumers without the provider, and
throws `useAuth must be used within AuthProvider`. This was a real bug; don't merge the files back.

---

## Authorization — read this before touching a route

The rules live in `dependencies.py`. There are three layers, and the common mistake is stopping at
the first:

1. `require_role("professor", "admin")` — checks *what kind of user*, never *which* one.
2. `assert_course_member(db, user, course)` — admin, owner, or enrolled.
3. `assert_problem_visible_to(db, user, problem)` — admin, author, or enrolled in a course containing
   it.

**Role is not ownership.** `require_role("professor")` means "some professor," not "this course's
professor." Several mutating handlers currently gate on role alone and are exploitable across
tenants (REVIEW.md F2). When you add a mutating route, check ownership explicitly.

**Students must never receive `solution_code` or hidden test cases.** The pattern is in
`problems/router.py:get_problem` — it rebuilds the response with `solution_code=None` and filters
`test_cases` by `is_hidden`. `ProblemResponse` includes both fields by default, so *every* endpoint
returning it to a possibly-student caller must redact. `GET /api/problems` currently does not
(REVIEW.md F1). If you are adding an endpoint that returns problems, redact it, and prefer
extracting the shared helper over copying the block a fourth time.

---

## Code execution — two runners, one of them unsafe

`submissions/runner.py` is the good one. Each test runs in an ephemeral container: `--network none`,
`--read-only`, `--user 65534`, 256 MB, 1 CPU, 64 PIDs, 5 s timeout, 64 KB output cap, killed by
name on timeout. Route all new execution through it.

`generation/service.py::_execute_solution` is the bad one — it runs LLM-written code with bare
`python3` / `gcc` subprocesses on the host, with full filesystem and network access. It should be
deleted in favor of the sandboxed runner (REVIEW.md F3). Do not copy its approach, and do not add a
third execution path.

Changing `Dockerfile.runner` means rebuilding the image; nothing does that automatically, and a
failed build is silent until a submission errors out. Build it and run one submission end to end
after any change there.

---

## Migrations

```bash
uv run alembic revision --autogenerate -m "short description"
uv run alembic upgrade head
```

The chain is linear with a single head — keep it that way. `render_as_batch=True` is set, which
SQLite needs for most `ALTER` operations.

`alembic/env.py` imports the model modules so their tables register on `Base.metadata`. Importing
*any* name from a module registers *every* model in it, which is why `PersonalizedProblem` is
covered without being named. If you add a new domain with models, add its import line there or
autogenerate will propose dropping your tables.

Run `alembic revision --autogenerate` and confirm the generated migration is empty before assuming
models and schema agree; delete the throwaway file afterward.

---

## Personalization model

Each `(problem, student)` pair gets a `PersonalizedProblem` row — a "slot" — holding an LLM-rewritten
`title` and `description` plus a `status` of `pending` / `generating` / `ready` / `failed`.

The reskin **must preserve the I/O contract**: same algorithm, same input format, same output
format, same constraints. Only the story changes. Test cases and the reference solution are shared
with the original problem and are never regenerated. If you touch
`generation/prompts.py::build_personalize_prompt`, preserving that invariant is the whole point —
break it and students get unsolvable problems with no signal to anyone.

Slots are created eagerly (on enrollment, and when a problem is added to a course) and generated by
fire-and-forget `asyncio.create_task`. This does not scale and loses in-flight work on restart
(REVIEW.md F5). Don't build more on top of that pattern; if you need background work, that finding
proposes a queue.

Concurrent generation is deduplicated by the `(problem_id, user_id)` unique constraint —
`get_or_create_personalized` catches `IntegrityError` and waits for the winner. Preserve that
handling.

---

## Gotchas

**Use `127.0.0.1`, not `localhost`, for the backend.** Docker Desktop binds `*:8000` on IPv6 and
macOS resolves `localhost` to `::1` first, so `localhost:8000` reaches Docker's API server and 404s
without CORS headers. The frontend default is `http://127.0.0.1:8000/api` for this reason. When a
request mysteriously 404s or a browser call fails with no response object, check
`lsof -nP -iTCP:8000 -sTCP:LISTEN`.

**Docker must be running** or every submission fails with a runner error.

**CORS origins are hardcoded** in `main.py` to ports 5173 on localhost and 127.0.0.1. A frontend on
any other origin needs that list changed.

**Access tokens last 30 minutes** with no refresh path, and the axios interceptor hard-redirects to
`/login` on any 401. Long manual test sessions will log you out.

**`is_public` on `Problem` is dead** — never set, never filtered on. Don't assume it gates
visibility. Generated problems are published to students immediately (REVIEW.md F4).

**There is no `/users` route in the frontend** even though the sidebar and dashboard link to it, and
the backend API is complete. Those links currently bounce to the dashboard.

---

## Working style here

- Prefer extending an existing domain module over creating a new one.
- When you find one of the catalogued defects in REVIEW.md while doing unrelated work, don't
  silently half-fix it — either fix it properly as its own change or leave it and mention it.
- The grading path is the one that must not regress silently: it has no tests and it has already
  shipped broken once. Exercise a real submission after touching anything under `submissions/` or
  `Dockerfile.runner`.
- Don't add dependencies casually. The backend is deliberately thin (FastAPI, SQLAlchemy, Alembic,
  an OpenAI-compatible client) and the frontend has no state-management or component library.
