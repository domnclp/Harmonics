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

Notification tables: `PushSubscription` (one row per browser/device, unique on `endpoint`), `NotificationPreference` (per-type toggles, 1:1 with `User`), `NotificationLog` (dedupe ledger, unique on `dedupeKey`). `UserSettings.timezone` holds an IANA zone, defaulting to `"UTC"` to mean "never configured".

**RLS convention**: every new table in the `public` schema needs `ENABLE ROW LEVEL SECURITY` with **no policies** — Supabase exposes `public` to PostgREST, but the app only ever reaches Postgres through Prisma. Add it in a separate migration alongside the schema one (see `20260729013332_enable_rls_notification_tables`).

Two model quirks worth knowing before touching completion logic:
- `blockInstanceService.findOrCreate` materializes `HabitCompletion` rows from `template.habits` but **not** `TaskCompletion` rows — template tasks are never materialized, so a never-opened block's checklist is habits-only.
- `completionPercentage: 0` is ambiguous (both "untouched" and "explicitly marked failed"). To detect genuinely unmarked items, filter on `!completed && !failureReason`.

## Notifications

Web Push (VAPID), one code path serving Windows/desktop and iOS. Requires `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` in `apps/api/.env` (`npx web-push generate-vapid-keys`); both are optional so the API still boots without them, and the scheduler no-ops with a warning.

- **Scheduler**: `notificationScheduler.tick(now = new Date())` in [notificationScheduler.service.ts](apps/api/src/services/notificationScheduler.service.ts), driven by `node-cron` every minute from [scheduler/index.ts](apps/api/src/scheduler/index.ts). It is started in `server.ts`, **not** `app.ts`, so importing the Express app never starts a timer. `now` is injectable — the only practical way to exercise time-dependent behaviour in a repo with no tests.
- **Dedupe**: every send claims a `NotificationLog.dedupeKey` (`userId:kind:dateKey:blockId`) **before** sending, catching P2002. Claim-first can lose a notification on a crash; send-first would re-send every minute after one, which is far worse. `dateKey` in the key is load-bearing — omitting it would suppress a notification permanently rather than for one day.
- **Timing**: triggers fire in a 6-minute catch-up window (`[target, target+6)`), so a late or restarted tick still delivers, with the dedupe log collapsing repeats. Six absorbs a 5-minute external cadence plus GitHub Actions queue delay; narrowing it risks silently dropping the first notification of the day.
- **Recurrence**: [apps/api/src/lib/recurrence.ts](apps/api/src/lib/recurrence.ts) mirrors [apps/web/src/lib/recurrence.ts](apps/web/src/lib/recurrence.ts) — **keep them in sync**. The API copy is all-UTC; the web copy is all-local. Each is internally consistent; mixing them causes off-by-one-day bugs. `dayOfWeek` is Monday-first everywhere except `analytics.controller.ts`.
- **Copy**: [notifications/copy.ts](apps/api/src/notifications/copy.ts) is pure and side-effect-free. Variants are guarded by `when` and ranked by `priority` — randomness applies only within the top priority tier, so a specific variant can't be outvoted by the generic fallback (this is what kept a 20%-completion day from reading "Solid day"). Every kind ends with a `when: () => true` fallback.
- **Streaks**: use `getUserHabitStreaks` (one query, 90-day lookback) from the scheduler, never `withHabitStreaks`, which is O(n) unbounded queries.
- **Web**: PWA via `vite-plugin-pwa` (`injectManifest`, SW source at `apps/web/src/sw.ts`). iOS only permits push from a home-screen-installed PWA, so `usePushNotifications` exposes a distinct `ios-needs-install` state. `apps/web/vercel.json` deliberately excludes `sw.js`/manifest/icons from the SPA catch-all rewrite.
- New browser globals must be added to the allowlist in [apps/web/eslint.config.js](apps/web/eslint.config.js) or `npm run lint` fails with `no-undef`.

## Deployment

Everything runs on permanently-free tiers. Web → Vercel Hobby (`apps/web/dist`); API → Render free web service ([render.yaml](render.yaml)); DB → Supabase free Postgres. Both apps have their own `vercel.json`. `railway.json` is kept only as a rollback path.

**The scheduler is external, not in-process.** Render's free tier sleeps after 15 minutes, which kills a `node-cron` timer, so `SCHEDULER_IN_PROCESS=false` there and [.github/workflows/notifications.yml](.github/workflows/notifications.yml) drives `POST /api/notifications/tick` instead. Exactly one scheduler should ever be live — set `NOTIFICATIONS_ENABLED=false` on any old host before pointing the workflow at a new one.

Three free-tier constraints that bite, all with silent failure modes:

- **Render bills by wall-clock uptime**: 750 instance-hours/month, workspace-wide, and exhausting them suspends the service until the 1st. A 24/7 ping costs 744h. The workflow therefore runs only 22:00–15:00 UTC (06:00–23:00 at UTC+8) for ~568h. Changing that window means re-checking that the 03:00-UTC log prune in `notificationScheduler.tick` still falls inside it.
- **Supabase pauses a free project after 7 days without database activity.** `tick()` returns early — before any query — when VAPID keys are missing, so a green workflow is not proof the DB was reached. The workflow hits `/health/db` separately for exactly this reason.
- **GitHub disables scheduled workflows after 60 days of repo inactivity**, with no error beyond one email. Unlimited Actions minutes require the repo to stay **public**.

**Checking what is deployed**: Settings shows both builds. The web commit is injected at build time by `define` in [apps/web/vite.config.ts](apps/web/vite.config.ts) (`__APP_COMMIT__`/`__APP_BUILT_AT__`, declared in `src/vite-env.d.ts`), reading `VERCEL_GIT_COMMIT_SHA` and falling back to a local `git rev-parse`; the API reports `RENDER_GIT_COMMIT` from its unauthenticated `/version` route. Both are shown because the two deploy separately — a fresh web commit beside a stale API one means Render is still building. The card also surfaces a waiting service worker, since a deployed update is not live until the new worker takes over.

Root [knip.json](knip.json) configures unused-export/dependency detection across workspaces.
