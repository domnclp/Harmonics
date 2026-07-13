---
name: run
description: Launch and verify the Harmonics app (web + api) locally on Windows/PowerShell. Use when asked to run, start, or check that a change works in the real app.
---

# Running Harmonics locally

This project has no automated test suite. "Verify it works" means running the app and exercising it.

## Start

From repo root, in PowerShell:

```powershell
npm run dev
```

This runs [.vscode/start-dev.ps1](../../../.vscode/start-dev.ps1), which:
- Kills anything already listening on ports 4000 (api) and 5173 (web)
- Starts `apps/api` (`npm run dev` → `tsx watch src/server.ts`) and `apps/web` (`npm run dev` → `vite`) as child processes
- Opens `http://localhost:5173` once the web server is ready
- Keeps running in the foreground until Ctrl+C, then kills both child processes and frees the ports again

Run this with `run_in_background: true` — it blocks until interrupted.

## Check it's up

- API health: `GET http://localhost:4000/health` → `{ ok: true }`
- API + DB health: `GET http://localhost:4000/health/db` → confirms Prisma can reach Postgres and which env vars are set
- Web: `http://localhost:5173`

## Prerequisites

- `apps/api/.env` and `apps/web/.env` must exist (copy from `.env.example` in each dir) with real Supabase project values. Without them, auth and DB calls will fail — ask the user for credentials rather than inventing placeholder values that look real.
- `npm run prisma:generate` must have been run at least once (Prisma client is generated, not committed).

## Stopping

Ctrl+C in the terminal running `npm run dev` triggers the script's cleanup (kills both processes, frees ports). If a port is stuck, `.vscode/tasks.json` has standalone "Stop API port" / "Stop Web port" PowerShell tasks that kill whatever is listening on 4000 / 5173.

## Manual verification checklist

There's no test suite (see [CLAUDE.md](../../../CLAUDE.md)), so after a change:
1. `tsc -b` in `apps/web`, `tsc` build in `apps/api` — typecheck
2. `npm run lint` (web) — eslint
3. Start the app and click through the actual page/flow you changed
