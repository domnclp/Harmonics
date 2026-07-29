import { useCallback, useEffect, useState } from "react";
import {
  deleteSubscription,
  fetchVapidPublicKey,
  isIosDevice,
  isPushSupported,
  isStandaloneDisplay,
  postSubscription,
  sendTestNotification,
  urlBase64ToUint8Array
} from "../lib/push";

export type PushState =
  | "loading"
  | "unsupported"
  /** iOS Safari before Add to Home Screen — PushManager does not exist yet. */
  | "ios-needs-install"
  | "default"
  | "denied"
  | "subscribed"
  | "error";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resolveState = useCallback(async (): Promise<PushState> => {
    if (!isPushSupported()) {
      // On iOS the push APIs are absent until the PWA is installed, so this is
      // "needs install" rather than genuinely unsupported.
      return isIosDevice() && !isStandaloneDisplay() ? "ios-needs-install" : "unsupported";
    }

    if (Notification.permission === "denied") return "denied";
    if (Notification.permission === "default") return "default";

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? "subscribed" : "default";
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const next = await resolveState();
        if (cancelled) return;
        setState(next);

        // Re-post the current subscription on load. This self-heals endpoint
        // rotation and cleared site data far more reliably than the
        // pushsubscriptionchange event, which has patchy support.
        if (next === "subscribed") {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) await postSubscription(subscription).catch(() => undefined);
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolveState]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const { publicKey, configured } = await fetchVapidPublicKey();
      if (!configured || !publicKey) {
        setError("Push notifications are not configured on the server yet.");
        setState("error");
        return;
      }

      // Must be called directly from the click handler — iOS enforces the user
      // gesture requirement strictly.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));

      await postSubscription(subscription);
      setState("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "Could not enable notifications.");
      setState("error");
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await deleteSubscription(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
      }

      setState("default");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "Could not turn off notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      await sendTestNotification();
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "Could not send a test notification.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, subscribe, unsubscribe, sendTest };
}
