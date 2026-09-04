import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().optional(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Optional so the API still boots without them; the scheduler no-ops and
  // logs a warning instead of crashing at import time.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:notifications@harmonics.app"),
  NOTIFICATIONS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // Off on hosts that sleep between requests, where an external scheduler
  // drives POST /api/notifications/tick instead of the in-process cron.
  SCHEDULER_IN_PROCESS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // Shared secret for the tick endpoint. Unset means the endpoint stays closed,
  // so a missing value can never silently expose the scheduler.
  SCHEDULER_TICK_SECRET: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // A raw ZodError is near-unreadable in deployment logs, and this throws at
  // import time — so name the offending variables explicitly.
  const issues = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
