# Harmonics

Schedule-first productivity app: plan the day, track routine habits/tasks, journal, and view analytics on completion patterns.

npm workspaces monorepo:
- `apps/web` — React 19, Vite, TypeScript, Tailwind, TanStack Query, Supabase Auth (client)
- `apps/api` — Node.js, Express, TypeScript, Prisma, Supabase Auth (JWT verification)

## Environment

- **Windows / PowerShell.** The dev tooling is PowerShell-native (`.vscode/start-dev.ps1`), not bash. When suggesting shell commands, use PowerShell syntax.
- `npm run dev` (root) starts both apps via that script — API on port 4000, web on port 5173.
- Env files: `apps/api/.env` and `apps/web/.env` (copy from the adjacent `.env.example`). Never fabricate real Supabase URLs/keys — ask the user if live credentials are needed.
- No automated test suite exists in this project (verified: no `*.test.*`/`*.spec.*` outside `node_modules`, no `test` script in either `package.json`). Treat this as a real gap, not an oversight to route around silently.
  - **Verify changes via**: `tsc -b` (web) / `tsc` build (api) for typecheck, `npm run lint` (web, eslint) for lint, and manually exercising the changed route/page (`/health` and `/health/db` endpoints exist for API sanity checks).

## Commands (run from root unless noted)

- `npm run dev` — start both apps
- `npm run build` — build api then web
- `npm run lint` — eslint on web only
- `npm run prisma:generate` / `npm run prisma:migrate` — Prisma client/migrations (api)
- Per-workspace: `npm run <script> --workspace @harmonics/api` or `--workspace @harmonics/web`

## apps/api conventions

Layering per resource: `routes/*.routes.ts` → `controllers/*.controller.ts` → `services/*.service.ts` (e.g. `scheduleBlock.routes.ts` → `scheduleBlock.controller.ts` → `scheduleBlock.service.ts`). Controllers validate request bodies inline with `zod`, then delegate to the service.

- All routes are mounted under `/api/*` in [apps/api/src/app.ts](apps/api/src/app.ts) behind `requireAuth` middleware.
- Auth: [apps/api/src/middleware/auth.middleware.ts](apps/api/src/middleware/auth.middleware.ts) verifies the Supabase JWT (local HMAC check first, falls back to a Supabase API call), then upserts a local `User` row and sets `req.authUser`. Controllers read the current user as `req.authUser!.id`.
- Errors: throw `AppError(statusCode, message)` from [error.middleware.ts](apps/api/src/middleware/error.middleware.ts); the central `errorHandler` formats the response.
- **ESM**: imports use explicit `.js` extensions even for `.ts` source files (e.g. `from "../services/foo.service.js"`) — required by the `type: module` + `tsc` setup. Keep this when adding new files.

## apps/web conventions

- `pages/` — route-level components; `components/ui/` — shadcn-style primitives (button, dialog, input, etc.); `components/<domain>/` — feature components grouped by domain (`schedule/`, `templates/`, `analytics/`); `hooks/` — TanStack Query hooks per resource (`useSchedules`, `useTemplates`, etc.); `lib/` — utilities.
- Data fetching goes through [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)'s `apiFetch<T>()`, which reads the Supabase session and attaches the bearer token. Query hooks in `hooks/` wrap this with TanStack Query. Prefer adding a hook over calling `apiFetch` directly from components.
- Class names: use `cn()` from [lib/utils.ts](apps/web/src/lib/utils.ts) (`clsx` + `tailwind-merge`) rather than string concatenation.

## Data model

Source of truth: [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).

`User` owns `Schedule`s and `BlockTemplate`s. A `BlockTemplate` defines a reusable habit/task block (name, color, icon, category, and its `TemplateHabit`/`TemplateTask` children). A `ScheduleBlock` places a template onto a schedule at a day/time with a `recurrenceRule` (WEEKLY, DAILY, ONCE, etc.). `BlockInstance` is the materialized per-day occurrence of a `ScheduleBlock`, tracking `completionPercentage`; it owns the actual `HabitCompletion`/`TaskCompletion` rows and an optional `JournalEntry`. Changing the model requires a Prisma migration (`npm run prisma:migrate`).

## Deployment

- Web → Vercel (`apps/web/dist`); API → Railway/Render; DB → Supabase Postgres. Both apps have their own `vercel.json`.
- Root [knip.json](knip.json) configures unused-export/dependency detection across workspaces.
