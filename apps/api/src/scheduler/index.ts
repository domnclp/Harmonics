import cron from "node-cron";
import { env } from "../config/env.js";
import { notificationScheduler } from "../services/notificationScheduler.service.js";

// node-cron does not serialize overlapping runs, and a slow tick (many users ×
// streak queries) could otherwise re-enter itself.
let running = false;

export const startNotificationScheduler = () => {
  if (!env.NOTIFICATIONS_ENABLED) {
    console.log("[notifications] disabled via NOTIFICATIONS_ENABLED");
    return;
  }

  // Hosts that sleep between requests cannot keep a timer alive; there an
  // external scheduler POSTs /api/notifications/tick instead.
  if (!env.SCHEDULER_IN_PROCESS) {
    console.log("[notifications] in-process cron off — expecting external ticks");
    return;
  }

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn("[notifications] VAPID keys missing — scheduler not started");
    return;
  }

  cron.schedule("* * * * *", async () => {
    if (running) {
      console.warn("[notifications] previous tick still running, skipping");
      return;
    }

    running = true;
    try {
      const result = await notificationScheduler.tick();
      if (result.notificationsSent || result.errors) {
        console.log("[notifications] tick", result);
      }
    } catch (error) {
      console.error("[notifications] tick failed", error);
    } finally {
      running = false;
    }
  });

  console.log("[notifications] scheduler started (every minute)");
};
