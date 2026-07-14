import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const storageKey = "activeDays";
const changeEvent = "activeDaysChange";
const allDays = [0, 1, 2, 3, 4, 5, 6];

const parseActiveDays = (value: string | null): number[] => {
  if (!value) return allDays;

  const days = value
    .split(",")
    .map((day) => Number.parseInt(day, 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);

  return unique.length ? unique : allDays;
};

const serializeActiveDays = (days: number[]) => parseActiveDays(days.join(",")).join(",");

export const getStoredActiveDays = (): number[] => {
  if (typeof window === "undefined") return allDays;
  return parseActiveDays(localStorage.getItem(storageKey));
};

const storeActiveDays = (value: number[]) => {
  localStorage.setItem(storageKey, serializeActiveDays(value));
  window.dispatchEvent(new Event(changeEvent));
};

type UserSettingsResponse = {
  activeDays: string;
};

export async function fetchActiveDaysFromServer(): Promise<number[]> {
  try {
    const data = await apiFetch<UserSettingsResponse>("/api/user-settings");
    const value = parseActiveDays(data.activeDays);
    storeActiveDays(value);
    return value;
  } catch {
    return getStoredActiveDays();
  }
}

export async function saveActiveDaysToServer(value: number[]): Promise<number[]> {
  const serialized = serializeActiveDays(value);
  const data = await apiFetch<UserSettingsResponse>("/api/user-settings", {
    method: "PATCH",
    body: { activeDays: serialized }
  });
  const result = parseActiveDays(data.activeDays);
  storeActiveDays(result);
  return result;
}

export function useActiveDays() {
  const [activeDays, setActiveDays] = useState<number[]>(getStoredActiveDays);

  useEffect(() => {
    fetchActiveDaysFromServer().then(setActiveDays);
  }, []);

  useEffect(() => {
    const sync = () => setActiveDays(getStoredActiveDays());

    window.addEventListener("storage", sync);
    window.addEventListener(changeEvent, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changeEvent, sync);
    };
  }, []);

  return activeDays;
}
