/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Injected by vite-plugin-pwa (injectManifest). Only app-shell assets are
// precached — API responses are deliberately never cached, since they are
// per-account and caching them in a shared SW would leak data across sessions.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

type PushPayload = {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
};

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const url = payload.url ?? "/dashboard";

  // waitUntil is required — without it the SW can be terminated before the
  // notification is shown.
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Harmonics", {
      body: payload.body ?? "",
      tag: payload.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = (event.notification.data as { url?: string } | undefined)?.url ?? "/dashboard";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Prefer focusing an already-open tab and navigating it, so tapping a
      // notification never strands a second copy of the app.
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // Navigation can fail across origins/redirects; focus alone is fine.
            }
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});

// Fires when the browser rotates an endpoint. Support is patchy, so the app
// also re-posts its subscription on every load as the real safety net.
self.addEventListener("pushsubscriptionchange", ((event: Event) => {
  const subscriptionEvent = event as ExtendableEvent & {
    oldSubscription?: PushSubscription;
    newSubscription?: PushSubscription;
  };

  subscriptionEvent.waitUntil(
    (async () => {
      const subscription = subscriptionEvent.newSubscription;
      if (!subscription) return;

      try {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON())
        });
      } catch {
        // Best effort only; the app re-subscribes on next load.
      }
    })()
  );
}) as EventListener);
