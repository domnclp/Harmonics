import webpush from "web-push";
import { prisma } from "../prisma/client.js";
import { env } from "../config/env.js";

export type PushPayload = {
  title: string;
  body: string;
  /** Collapses same-key notifications client-side; the dedupe key is a good value. */
  tag?: string;
  /** Path the notification opens, e.g. "/dashboard?block=abc&date=2026-07-29". */
  url?: string;
};

export type SubscribeInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string | null;
};

let configured = false;

/** Returns false when VAPID keys are absent so callers can degrade gracefully. */
export const isPushConfigured = () => {
  if (configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
};

// Push services return these once a subscription is permanently gone (app
// uninstalled, PWA removed from the home screen, endpoint rotated).
const goneStatusCodes = new Set([404, 410]);

export const pushService = {
  async subscribe(userId: string, input: SubscribeInput) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null
      },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null
      }
    });
  },

  async unsubscribe(userId: string, endpoint: string) {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  listSubscriptions(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
  },

  /**
   * Send to every device a user has registered.
   *
   * Uses allSettled so one dead endpoint cannot block the others, and prunes
   * subscriptions the push service reports as permanently gone.
   */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!isPushConfigured()) return { sent: 0, pruned: 0, failed: 0 };

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subscriptions.length) return { sent: 0, pruned: 0, failed: 0 };

    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          body
        )
      )
    );

    const stale: string[] = [];
    let sent = 0;
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }

      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode && goneStatusCodes.has(statusCode)) {
        stale.push(subscriptions[index]!.endpoint);
        return;
      }

      failed += 1;
      console.error("[push] send failed", { endpoint: subscriptions[index]!.endpoint, statusCode });
    });

    if (stale.length) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
    }

    return { sent, pruned: stale.length, failed };
  }
};
