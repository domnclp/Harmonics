import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const storageKey = "notificationPrefs";
const changeEvent = "notificationPrefsChange";

export type NotificationPrefs = {
  headsUpEnabled: boolean;
  headsUpMinutes: number;
  blockStartEnabled: boolean;
  blockEndEnabled: boolean;
  streakRiskEnabled: boolean;
  streakRiskTime: string;
  dailyAgendaEnabled: boolean;
  dayWrapUpEnabled: boolean;
  dayWrapUpTime: string;
};

// Mirrors the @default values on NotificationPreference in schema.prisma.
const defaultPrefs: NotificationPrefs = {
  headsUpEnabled: true,
  headsUpMinutes: 30,
  blockStartEnabled: false,
  blockEndEnabled: true,
  streakRiskEnabled: false,
  streakRiskTime: "20:00",
  dailyAgendaEnabled: true,
  dayWrapUpEnabled: false,
  dayWrapUpTime: "21:30"
};

const allowedLeadMinutes = [5, 10, 15, 30];

const normalizePrefs = (value: Partial<NotificationPrefs> | null): NotificationPrefs => {
  if (!value) return defaultPrefs;

  return {
    headsUpEnabled: value.headsUpEnabled ?? defaultPrefs.headsUpEnabled,
    headsUpMinutes: allowedLeadMinutes.includes(value.headsUpMinutes ?? 0)
      ? value.headsUpMinutes!
      : defaultPrefs.headsUpMinutes,
    blockStartEnabled: value.blockStartEnabled ?? defaultPrefs.blockStartEnabled,
    blockEndEnabled: value.blockEndEnabled ?? defaultPrefs.blockEndEnabled,
    streakRiskEnabled: value.streakRiskEnabled ?? defaultPrefs.streakRiskEnabled,
    streakRiskTime: value.streakRiskTime ?? defaultPrefs.streakRiskTime,
    dailyAgendaEnabled: value.dailyAgendaEnabled ?? defaultPrefs.dailyAgendaEnabled,
    dayWrapUpEnabled: value.dayWrapUpEnabled ?? defaultPrefs.dayWrapUpEnabled,
    dayWrapUpTime: value.dayWrapUpTime ?? defaultPrefs.dayWrapUpTime
  };
};

export const getStoredNotificationPrefs = (): NotificationPrefs => {
  if (typeof window === "undefined") return defaultPrefs;

  try {
    const raw = localStorage.getItem(storageKey);
    return normalizePrefs(raw ? (JSON.parse(raw) as Partial<NotificationPrefs>) : null);
  } catch {
    return defaultPrefs;
  }
};

const storeNotificationPrefs = (value: NotificationPrefs) => {
  localStorage.setItem(storageKey, JSON.stringify(normalizePrefs(value)));
  window.dispatchEvent(new Event(changeEvent));
};

export async function fetchNotificationPrefsFromServer(): Promise<NotificationPrefs> {
  try {
    const data = await apiFetch<Partial<NotificationPrefs>>("/api/push/preferences");
    const prefs = normalizePrefs(data);
    storeNotificationPrefs(prefs);
    return prefs;
  } catch {
    return getStoredNotificationPrefs();
  }
}

export async function saveNotificationPrefsToServer(value: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const data = await apiFetch<Partial<NotificationPrefs>>("/api/push/preferences", {
    method: "PATCH",
    body: value as Record<string, unknown>
  });
  const prefs = normalizePrefs(data);
  storeNotificationPrefs(prefs);
  return prefs;
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getStoredNotificationPrefs);

  useEffect(() => {
    fetchNotificationPrefsFromServer().then(setPrefs);
  }, []);

  useEffect(() => {
    const sync = () => setPrefs(getStoredNotificationPrefs());

    window.addEventListener("storage", sync);
    window.addEventListener(changeEvent, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changeEvent, sync);
    };
  }, []);

  return prefs;
}
