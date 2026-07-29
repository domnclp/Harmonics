import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const storageKey = "timezone";
const changeEvent = "timezoneChange";

// Matches UserSettings.timezone's schema default. A stored value of "UTC" means
// "never configured", which is what lets us autodetect exactly once without
// overriding a deliberate choice later.
const unsetTimezone = "UTC";

export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || unsetTimezone;
  } catch {
    return unsetTimezone;
  }
};

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const normalizeTimezone = (value: string | null): string =>
  value && isValidTimezone(value) ? value : unsetTimezone;

export const getStoredTimezone = (): string => {
  if (typeof window === "undefined") return unsetTimezone;
  return normalizeTimezone(localStorage.getItem(storageKey));
};

const storeTimezone = (value: string) => {
  localStorage.setItem(storageKey, normalizeTimezone(value));
  window.dispatchEvent(new Event(changeEvent));
};

type UserSettingsResponse = {
  timezone: string;
};

export async function fetchTimezoneFromServer(): Promise<string> {
  try {
    const data = await apiFetch<UserSettingsResponse>("/api/user-settings");
    const stored = normalizeTimezone(data.timezone);

    // Autodetect only while the server still holds the never-set default, so a
    // user who deliberately picked a zone is not overwritten when travelling.
    if (stored === unsetTimezone) {
      const detected = detectTimezone();
      if (detected !== unsetTimezone) return saveTimezoneToServer(detected);
    }

    storeTimezone(stored);
    return stored;
  } catch {
    return getStoredTimezone();
  }
}

export async function saveTimezoneToServer(value: string): Promise<string> {
  const normalized = normalizeTimezone(value);
  const data = await apiFetch<UserSettingsResponse>("/api/user-settings", {
    method: "PATCH",
    body: { timezone: normalized }
  });
  const result = normalizeTimezone(data.timezone);
  storeTimezone(result);
  return result;
}

export function useTimezone() {
  const [timezone, setTimezone] = useState<string>(getStoredTimezone);

  useEffect(() => {
    fetchTimezoneFromServer().then(setTimezone);
  }, []);

  useEffect(() => {
    const sync = () => setTimezone(getStoredTimezone());

    window.addEventListener("storage", sync);
    window.addEventListener(changeEvent, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changeEvent, sync);
    };
  }, []);

  return timezone;
}
