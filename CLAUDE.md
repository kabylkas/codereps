# CLAUDE.md

Working agreement for this repo. Technical conventions live in [AGENTS.md](AGENTS.md) — read that
for architecture, commands, and gotchas. This file holds standing instructions about *how to work
here*, not what the code is.

## Standing instructions

- **Play the completion sound when a response finishes.** Wired as an async `Stop` hook in
  `~/.claude/settings.json`: `afplay /Users/almubdimutaikhan/.claude/done.mp3`. The hook is what
  actually plays it — the harness runs `Stop` hooks, so this is not something to do by hand each
  turn. The clip is trimmed to 7 s (0.4 s fade-out); the hook is still `async` so it never delays
  the end of a turn. Manage it with `/hooks`.
- **Keep this file current — rules and decisions only.** When a durable working preference,
  correction, or decision comes up in conversation, append it here. Do *not* keep a per-message
  log: this file loads into context every session, so it stays small and only grows when something
  durable actually changes. Quiet turns add nothing.

## Project state

- Setup runbook and troubleshooting: [README.md](README.md)
- Screen-by-screen flow map and replayable scenarios: [user-flow.md](user-flow.md)
- Architecture assessment, known defects, recommended work order: [REVIEW.md](REVIEW.md)

Three defects were fixed during setup and are recorded in REVIEW.md as F11–F13: the sandbox image
could not build, login was unreachable over `localhost` (Docker Desktop holds `*:8000` on IPv6), and
editing the auth provider crashed the app via Fast Refresh.

`ACCESS_TOKEN_EXPIRE_MINUTES` was raised to 480 (8 h) in `backend/.env` on 2026-08-23 so stepping
away mid-problem doesn't log you out. Dev convenience only — there is still no refresh path or
revocation (F9), so shorten it before any deployment.

**Known blocker, unfixed:** without `OPENROUTER_API_KEY`, `GET /problems/:id/personalized` returns
500 (the OpenRouter 401 escapes `get_or_create_personalized` unhandled), so students cannot open any
problem in the UI. The user asked not to fix bugs beyond login, so this is documented, not patched.

**Render deployment prepared, 2026-08-23.** `render.yaml` deploys frontend + backend + a free
Postgres (see the file's header comment for the manual post-deploy steps — CORS/API-URL wiring can't
be automated since the URLs don't exist until first deploy). Grading is deliberately **off** in that
deployment: `submissions/runner.py` needs a real Docker daemon, which no PaaS web service exposes —
not a Render limitation specifically, true of Render/Railway/Fly/Heroku alike, since none of them
sell bare VMs. `CODE_EXECUTION_ENABLED=false` makes `/submit` return a clean 503 instead of crashing
on a missing `docker` binary, and the solve page shows a "coming soon" notice with Submit disabled
instead of hitting it. Piston (considered first) is a dead end for this project specifically — its
public API now requires manual approval and explicitly excludes portfolio/academic use. Real grading
in production needs either a VM with Docker (e.g. Oracle Cloud Always Free) that `runner.py` calls
out to, or a swap to a hosted execution API (Judge0 CE's public instance was the evaluated option).

Three findings are open and unfixed, in priority order — F1 (any student can read every solution),
F2 (any professor can rewrite another's course), F3 (generation executes untrusted code on the
host). Nothing new should be built on top of these.

## Reminders

- `Bash` tool commands are preferred over the dedicated Read/Edit/Write tools in this session.
- Never commit `backend/.env` or `*.db`.
- Docker must be running or every submission fails.
