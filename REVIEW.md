# Architecture Review — codereps.ai

**Reviewed** 23 August 2026 · **Commit** `4752828` · **Reviewer** senior architecture pass on handoff

Backend: 41 files, FastAPI + SQLite. Frontend: ~6,000 lines, React 19 + Vite. Tests: none.

> The platform's inner loop — generate, personalize, solve, grade in a sandbox — works end to end
> today. The assessment half that the product thesis rests on has not been built, and the
> authorization layer has three holes that hand students the answer key.

---

## Contents

- [The read](#the-read)
- [Setup status](#setup-status)
- [Findings](#findings) — security and correctness, severity ordered
- [README promise against shipped reality](#readme-promise-against-shipped-reality)
- [Smaller things](#smaller-things)
- [Where I'd start](#where-id-start)

---

## The read

This is a well-structured prototype, further along than most handoffs. The module layout
(`router / service / schemas / models` per domain) is consistent and clean, migrations are linear
with zero model drift, and the newest work — Docker-sandboxed execution — is genuinely careful: it
enforces the time limit and blocks network egress, both confirmed.

The gap is not code quality. It is that **the product described in the README is about half built**,
and the unbuilt half is the half that makes the pedagogy work. Practice without a controlled exam is
a problem bank; the README's argument is that the exam is what makes students practice.

Two things need attention before anything else: the answer key is readable by any logged-in student
through one unguarded endpoint, and any professor can rewrite another professor's course. Both are
small fixes. Both currently void the product's central promise.

---

## Setup status

Backend on `:8000`, frontend on `:5173`, database migrated and seeded, sandbox image built.

| | |
|---|---|
| Dependencies | `uv sync` · `npm install` — clean |
| Migrations | 6 applied, no model drift (verified via `--autogenerate`) |
| Seed data | 3 roles, 8 tags |
| Sandbox image | **was broken → fixed** |
| Submission loop | pass / fail / timeout all verified |
| Login | **was broken → fixed** |
| TypeScript | compiles clean |
| ESLint | 5 errors, 4 warnings |
| AI features | require `OPENROUTER_API_KEY` |

Two blockers had to be fixed to get the app running. Both are recorded as findings
[F11](#f11--fixed--the-sandbox-image-could-not-build) and
[F12](#f12--fixed--login-unreachable-in-the-browser).

Everything else works without an `OPENROUTER_API_KEY`. AI generation and per-student
personalization need one; courses, topics, hand-authored problems, submission, and grading do not.

---

## Findings

Severity ordered. Entries marked **verified** were reproduced against a running instance and the
evidence blocks are real output. Entries marked **from source** are read off the code with high
confidence but were not runtime-probed.

### F1 · Critical · Any student can read every solution and hidden test in the database

**verified** — `backend/app/problems/router.py:41` · `GET /api/problems`

`list_problems` requires only `get_current_user` and returns `service.get_problems()` unfiltered as
`ProblemResponse` — which includes `solution_code` and every test case, hidden ones included. There
is no enrollment filter, no ownership filter, and no student-role redaction.

The single-problem endpoint next to it does all three correctly: it calls
`assert_problem_visible_to` and rebuilds the response with `solution_code=None` and hidden tests
stripped. The list endpoint bypasses all of it. A student who never opens the UI's own screens gets
the whole answer key from one request.

```
$ curl $API/problems -H "Authorization: Bearer $STUDENT_TOKEN"

count: 2
  title: MIDTERM Q1 - do not leak
    solution_code: 'print(42)  # THE ANSWER'
  title: Sum Two
    hidden tests: ['15']

# for contrast, the per-problem endpoint gets it right:
$ curl -o /dev/null -w '%{http_code}' $API/problems/$SECRET_ID ...
403
```

**Fix.** Scope the query to courses the caller belongs to (or authored), and route the result through
the same redaction the detail endpoint already performs. Better: pull that redaction into one
`to_student_response()` helper so the next endpoint cannot forget it.

### F2 · Critical · Any professor can rewrite any other professor's course and test cases

**verified** — `backend/app/courses/router.py:160,178` · `backend/app/problems/router.py:203,219,233`

These handlers gate on `require_role("professor", "admin")` — role, not ownership. Being *a*
professor is treated as being *the* professor. Read paths in the same files check ownership properly
(a foreign course roster correctly returns 403), so the checks exist; they were just omitted on the
write paths.

Rigging a test case is the sharpest edge: a professor can silently change the expected output on
someone else's problem and every student submission starts failing.

```
1) add own problem to a course they don't own      HTTP 201
2) delete the owner's problem from that course     HTTP 204
3) add a rigged test case to their problem         HTTP 201
4) read that course's student roster               HTTP 403
5) read the course itself                          HTTP 403

# course contents afterward — the owner's problem is gone:
   - Evil injected problem
```

**Fix.** Add `assert_course_owner(db, user, course)` and `assert_problem_owner(db, user, problem)`
next to the existing helpers in `dependencies.py`, and apply them to every mutating handler. Note
`remove_problem` doesn't even load the course first — it should 404 before it 403s.

### F3 · High · Problem generation executes untrusted code directly on the host

**from source** — `backend/app/generation/service.py:72` · `_execute_solution`

The generation pipeline runs LLM-written solutions to derive expected outputs — and does it with
bare `python3` and `gcc` subprocesses in a temp directory. No container, no network isolation, no
memory or PID limit. It has the process's full filesystem and network access, including the `.env`
holding `SECRET_KEY`.

Model output is untrusted input, and the prompt is partly attacker-influenced:
`custom_instructions` and topic names flow into it from the professor-facing form. The submissions
path was hardened into Docker one commit ago; this path is the same problem with the sandbox left
off.

**Fix.** Delete `_exec_python` / `_exec_c` and call `submissions/runner.py` instead. It already
handles both languages, output caps, and timeouts — this is code deletion, not new work, and it
removes the divergence where one runner gets hardened and the other silently doesn't.

### F4 · Medium · Generated problems go live to students with no review step

**verified by grep** — `backend/app/generation/service.py:317` · `_save_problem`

`_save_problem` writes the problem, creates its `CourseProblem` link, and fires personalization
slots for every enrolled student in one transaction. The moment the LLM returns, students can see
it.

The README promises the opposite: *"professors review and approve all content."* A
`Problem.is_public` column exists for exactly this and is dead — written by the default only, never
set, never filtered on. The product's stated quality guarantee is currently a comment.

**Fix.** Give `Problem` a real `status` (`draft` / `published` / `archived`), have generation stop at
`draft`, and move the `CourseProblem` link plus slot creation behind an explicit publish action. The
generation dialog already lists what it produced — it just needs an *Approve* button.

### F5 · Medium · Personalization fans out to one LLM call per student per problem, in-process

**from source** — `backend/app/problems/personalization_service.py:97,144`

Enrollment creates a slot for every problem in the course; adding a problem creates a slot for every
enrolled student. Generation then runs as a bare `asyncio.create_task` looping *sequentially* over
slots inside the web process. A 40-student section with 150 problems is 6,000 LLM calls with no
queue, no rate limiting, no retry, and no backpressure.

Three consequences follow. The task reference isn't held, so it can be garbage-collected mid-run. A
restart or deploy abandons every in-flight slot as `pending` — recoverable only because a student
happening to open that problem triggers inline generation. And the inline path makes an HTTP request
block on an LLM round trip while polling `await db.refresh()` once a second for up to 30 seconds.

This is the item most likely to break first in a real classroom, and it's the one that costs real
money when it does.

**Fix.** Move slot generation to a durable queue with a bounded worker pool — ARQ or Celery against
Redis, or a `jobs` table plus a worker process if you want to stay dependency-light. Generate lazily
on first view with a real placeholder state rather than eagerly at enrollment, and cap concurrent
calls per course.

### F6 · Medium · Grading runs synchronously inside the request, one test at a time

**from source** — `backend/app/submissions/runner.py:42` · `run_code`

Each test spawns a fresh container and awaits it before the next. Measured cold container overhead
was 104–143 ms per test, so a 10-test problem is well over a second of held request, and the C path
pays a second container for compilation. The frontend sets a 60-second axios timeout, which is the
tell.

Combine that with SQLite's single writer and one uvicorn worker and a lab section submitting
together will queue behind itself. It's fine for a pilot; it will not survive an exam, which is
precisely when everyone submits at once.

**Fix.** Compile once and reuse the container across a problem's tests; run tests concurrently with
a semaphore. Then make submission asynchronous — return the submission id, grade on a worker, have
the client poll or subscribe. That also moves you off SQLite onto Postgres, which you need before
any real deployment anyway.

### F7 · Medium · Students never receive the starter code that was generated for them

**from source** — `frontend/src/pages/problems/ProblemSolvePage.tsx:33`

The solve page loads the problem and then calls `setCode("")`, discarding `problem.starter_code`.
The generation pipeline produces starter code, the model persists it, the API returns it — and the
editor opens empty. Students in a C course start from a blank buffer.

Related, and worth fixing in the same pass: editor contents live only in React state, so a refresh
or an accidental navigation loses the student's work with no warning.

**Fix.** Seed the editor from `starter_code`, and draft to `localStorage` keyed by problem id with a
*Reset to starter* control.

### F8 · Low · The admin user-management screen doesn't exist

**from source** — `frontend/src/App.tsx` · `frontend/src/components/layout/Sidebar.tsx:40`

The sidebar shows *Users* to admins and the dashboard has a *Manage Users* card, but `App.tsx`
declares no `/users` route — so both fall through the catch-all and bounce back to the dashboard.
The backend API is complete: list, change role, activate/deactivate, with self-deactivation
correctly blocked.

The Administrator role in the README is therefore backend-only. It's a page of UI against a finished
API.

### F9 · Low · Access tokens expire in 30 minutes with no refresh path

**from source** — `backend/app/config.py:8` · `frontend/src/api/client.ts:21`

A 30-minute token, no refresh endpoint, and a 401 interceptor that clears storage and hard-redirects
to `/login`. A student thinking through a hard problem for half an hour is logged out on submit and
loses the buffer (see F7). The two defects compound into losing real work.

Tokens are also unrevocable — no `jti`, no deny list — so deactivating an account leaves its token
valid until expiry. That's tolerable at 30 minutes and becomes a real problem the moment you extend
the lifetime, which you should.

### F10 · Low · Nothing rate-limits or bounds submissions

**from source** — `backend/app/submissions/router.py:14`

No attempt cap, no cooldown, no per-user throttle. A student can probe hidden test cases by
submitting variants until the failure messages reveal expected outputs — the `actual_output` and
`error_message` fields come back in full. It's also a trivially cheap way to saturate the container
host.

### F11 · Fixed · The sandbox image could not build

**verified** — `backend/Dockerfile.runner:9`

`apt-get purge -y --auto-remove apt-listchanges` exits 100 in `python:3.12-slim` — the package isn't
there. The build aborted on that layer, so `codereps-runner` never existed and every submission
would have failed with a runner error. The sandboxing commit had not been exercised.

The layer was replaced with one that removes the apt sources and binaries outright, which achieves
the comment's stated intent. Verified afterward:

```
correct submission      passed  2/2   (143 ms, 104 ms)
wrong submission        failed  0/2
while True: pass        failed  Time limit exceeded (5s)
socket to 1.1.1.1:80    failed  Traceback ... OSError
```

### F12 · Fixed · Login unreachable in the browser

**verified** — `frontend/src/api/client.ts:6`

Docker Desktop binds `*:8000` on IPv6. macOS resolves `localhost` to `::1` before `127.0.0.1`, so
the frontend's `http://localhost:8000/api` reached Docker's own uvicorn-based API server, which
404s without CORS headers. The browser blocked the response, axios saw a network error with no
response object, and the login form showed a bare "Login failed" — the console logged
`Login error: undefined undefined`. uvicorn binds IPv4 only, so it never saw the request.

```
$ curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/health   # 200  → uvicorn
$ curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/health   # 404  → Docker
$ lsof -nP -iTCP:8000 -sTCP:LISTEN
com.docke  6839  ...  IPv6  TCP *:8000 (LISTEN)
Python     9158  ...  IPv4  TCP 127.0.0.1:8000 (LISTEN)
```

The default API base URL now uses the IPv4 literal. Any port shared with Docker Desktop has this
hazard; a Vite dev proxy (`/api` → `127.0.0.1:8000`) would remove the class of problem entirely and
drop the dev CORS requirement with it.

### F13 · Fixed · Editing the auth provider crashed the app

**verified** — `frontend/src/context/AuthContext.tsx`

`AuthContext.tsx` exported both a component (`AuthProvider`) and non-components (`useAuth`, the
context), so React Fast Refresh could not hot-reload it — `hmr invalidate ... "useAuth" export is
incompatible`. On any edit it remounted consumers without the provider and threw
`useAuth must be used within AuthProvider`, blanking the page until a manual reload. This was the
`react-refresh/only-export-components` lint error biting in practice.

The hook and context moved to `src/context/useAuth.ts` (no component exports); `AuthContext.tsx` now
exports only `AuthProvider`. 13 import sites updated, TypeScript clean, and the lint error is gone.

---

## README promise against shipped reality

Read the README as a spec and the shape of the remaining work is clear. The practice loop is real.
The assessment and feedback loops — the two that carry the pedagogical argument — have no models, no
endpoints, and no UI.

| Capability | State | What's actually there |
|---|---|---|
| Role-based access | Partial | Three roles enforced; ownership checks missing on write paths; no admin UI |
| Course creation & enrollment | Done | Join codes, roster, soft delete, topics |
| Problem Design Studio | Partial | Authoring and AI generation work; no review gate, no versioning, no duplicate detection |
| Practice-first learning | Done | Personalized pool, editor, sandboxed grading, attempt history |
| Controlled assessments | **Not started** | No exam model, no timing, no attempt locking, no draw-from-pool, no lockdown |
| AI-assisted feedback | **Not started** | No feedback model or endpoint; submissions are stored but never analyzed |
| Class-wide insights | **Not started** | No aggregation; a professor cannot see whether a student has solved anything |

Three observations on that table matter more than the individual rows.

**The exam engine is the product.** The README's argument is that a visible pool plus a controlled
exam drawn from it is what motivates practice. Without the exam, codereps is a nicer LeetCode for
one class — and the personalization work, which exists specifically to make copying useless, has
nothing to protect.

**Professors are currently flying blind.** Submissions are stored with everything you'd need, but
the only read paths are "my submissions for one problem" and "one submission by id." A professor
cannot answer *who is struggling* — the question the whole tool exists to answer. This is the
highest value-per-line work available: the data is already in the table.

**Personalization is a strong idea that needs a correctness check.** Rewriting the narrative while
holding the I/O contract fixed is the right design, and the prompt is well-constrained. But nothing
verifies the constraint held — no check that the reference solution still passes against the
reskinned statement. One bad rewrite gives one student an unsolvable problem, and the professor will
never hear about it because there's no signal for it.

---

## Smaller things

- **No tests, no CI.** Zero test files in either half, no workflow config, no `pytest` dependency.
  For a codebase whose job is grading other people's code, the grading path is the one that must not
  regress silently — and it just did, invisibly, in the Docker commit.
- **CORS is hardcoded** to `localhost:5173` in `main.py`, so nothing deploys without a code change.
  Move it to settings alongside the rest of the config.
- **No deployment artifacts.** No app Dockerfile, no compose file, no Makefile. The runner image is
  built by hand — worth a compose service or a make target so it can't be forgotten again.
- **Five ESLint errors**, all the same React 19 pattern: `setState` called synchronously in an
  effect body. Harmless today, and the kind of cascading-render debt that gets expensive once the
  pages carry real data. TypeScript itself compiles clean.
- **`npm audit` reports 9 high findings**, including a `react-router` deserialization RCE and a
  `vite` path traversal. Both are dev/SSR-path issues that matter less for a static SPA build, but
  they're one `npm audit fix` away.
- **Deleting a topic orphans its problems** rather than blocking or reassigning — `topic_id` is set
  to `NULL` and the problems stay in the course, now unreachable through the topic-filtered student
  view.
- **Nothing enforces course/problem language agreement.** A Python course happily accepts a C
  problem; the mismatch only surfaces when a student's submission is rejected at submit time.
- **Seeded demo passwords are weak** (`admin123`) and the register endpoint enforces no password
  policy at all — only the change-password path checks length, and only for six characters.

---

## Where I'd start

Ordered by dependency, not by size. The first two are the same afternoon; nothing below them is
worth building on top of a platform that leaks its own answer key.

**1. Close the three authorization holes.** Scope and redact `GET /api/problems`; add owner
assertions to every mutating course and problem handler; point generation at the sandboxed runner.
Small, contained, and each one currently invalidates a promise the product makes.

**2. Put a test harness around grading and authorization.** `pytest` + `httpx`, a fixture per role,
and one test per finding above so none of them silently return. The Docker regression is the
argument: it shipped broken and nothing noticed. Wire it to CI in the same pass.

**3. Build the professor's progress view.** Per-student and per-problem solve rates, attempt counts,
and the problems the class fails most. This is aggregation over data you already store, and it's
what makes the tool worth opening daily — it also tells you whether the practice loop actually works
before you invest in the exam engine.

**4. Design the exam engine.** The largest remaining piece and the one that needs decisions before
code: how problems are drawn from the pool, whether variants are equated for difficulty, how
attempts lock, what happens on disconnect, and what "controlled environment" means in practice.
Model it as `Exam → ExamProblem → ExamAttempt → ExamSubmission`, reusing the existing runner rather
than forking a second grading path.

**5. Move generation and grading onto a queue, and onto Postgres.** Required before the first real
exam, for the reason the exam creates: simultaneous submission. Doing it after the exam model exists
means you only build the worker once.

**6. Then the feedback engine.** Deliberately last. It reads exam results, so it can't be built
before them — and it's the piece that most benefits from having real classroom data to look at
rather than guessed-at categories of misunderstanding.

---

*Findings marked "verified" were reproduced against a local instance; evidence blocks are real
output. Application code was left unchanged except for the two fixes required to make the app run
(F11, F12) and the Fast Refresh split (F13).*
