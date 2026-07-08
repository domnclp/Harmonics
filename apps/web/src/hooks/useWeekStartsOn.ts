import { useEffect, useState } from "react";
import type { WeekStartsOn } from "../lib/date";
import { apiFetch } from "../lib/api";

const storageKey = "weekStartsOn";
const changeEvent = "weekStartsOnChange";

export const getStoredWeekStartsOn = (): WeekStartsOn => {
  if (typeof window === "undefined") return "monday";
  return localStorage.getItem(storageKey) === "sunday" ? "sunday" : "monday";
};

const storeWeekStartsOn = (value: WeekStartsOn) => {
  localStorage.setItem(storageKey, value);
  window.dispatchEvent(new Event(changeEvent));
};

type UserSettingsResponse = {
  weekStartsOn: string;
};

export async function fetchWeekStartsOnFromServer(): Promise<WeekStartsOn> {
  try {
    const data = await apiFetch<UserSettingsResponse>("/api/user-settings");
    const value = data.weekStartsOn === "sunday" ? "sunday" : "monday";
    storeWeekStartsOn(value);
    return value;
  } catch {
    return getStoredWeekStartsOn();
  }
}

export async function saveWeekStartsOnToServer(value: WeekStartsOn): Promise<WeekStartsOn> {
  const data = await apiFetch<UserSettingsResponse>("/api/user-settings", {
    method: "PATCH",
    body: { weekStartsOn: value }
  });
  const result = data.weekStartsOn === "sunday" ? "sunday" : "monday";
  storeWeekStartsOn(result);
  return result;
}

export function useWeekStartsOn() {
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(getStoredWeekStartsOn);

  useEffect(() => {
    fetchWeekStartsOnFromServer().then(setWeekStartsOn);
  }, []);

  useEffect(() => {
    const sync = () => setWeekStartsOn(getStoredWeekStartsOn());

    window.addEventListener("storage", sync);
    window.addEventListener(changeEvent, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changeEvent, sync);
    };
  }, []);

  return weekStartsOn;
}
