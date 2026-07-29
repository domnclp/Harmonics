import { apiFetch } from "./api";

/** VAPID keys are base64url; PushManager wants raw bytes. */
export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
};

export const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports itself as MacIntel, so touch points are the reliable tell.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

export const isStandaloneDisplay = () => {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
};

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

type PublicKeyResponse = { publicKey: string | null; configured: boolean };

export const fetchVapidPublicKey = () => apiFetch<PublicKeyResponse>("/api/push/public-key");

export const postSubscription = (subscription: PushSubscription) =>
  apiFetch<{ ok: boolean }>("/api/push/subscribe", {
    method: "POST",
    body: subscription.toJSON() as unknown as Record<string, unknown>
  });

export const deleteSubscription = (endpoint: string) =>
  apiFetch<void>("/api/push/subscribe", { method: "DELETE", body: { endpoint } });

export const sendTestNotification = () => apiFetch<{ sent: number }>("/api/push/test", { method: "POST" });
