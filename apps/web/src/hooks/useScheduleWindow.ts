import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const changeEvent = "scheduleWindowChange";

export type ScheduleWindow = {
  startTime: string;
  endTime: string;
};

const defaultWindow: ScheduleWindow = {
  startTime: "06:00",
  endTime: "23:00"
};

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const normalizeWindow = (startTime: string | null, endTime: string | null): ScheduleWindow => {
  if (!startTime || !endTime || !isValidTime(startTime) || !isValidTime(endTime)) {
    return defaultWindow;
  }

  return { startTime, endTime };
};

export const getStoredScheduleWindow = (): ScheduleWindow => {
  if (typeof window === "undefined") return defaultWindow;
  return normalizeWindow(localStorage.getItem("scheduleStart"), localStorage.getItem("scheduleEnd"));
};

const storeScheduleWindow = (value: ScheduleWindow) => {
  const normalized = normalizeWindow(value.startTime, value.endTime);
  localStorage.setItem("scheduleStart", normalized.startTime);
  localStorage.setItem("scheduleEnd", normalized.endTime);
  window.dispatchEvent(new Event(changeEvent));
};

type UserSettingsResponse = {
  scheduleStart: string;
  scheduleEnd: string;
};

export async function fetchScheduleWindowFromServer(): Promise<ScheduleWindow> {
  try {
    const data = await apiFetch<UserSettingsResponse>("/api/user-settings");
    const window = normalizeWindow(data.scheduleStart, data.scheduleEnd);
    storeScheduleWindow(window);
    return window;
  } catch {
    return getStoredScheduleWindow();
  }
}

export async function saveScheduleWindowToServer(value: ScheduleWindow): Promise<ScheduleWindow> {
  const normalized = normalizeWindow(value.startTime, value.endTime);
  const data = await apiFetch<UserSettingsResponse>("/api/user-settings", {
    method: "PATCH",
    body: { scheduleStart: normalized.startTime, scheduleEnd: normalized.endTime }
  });
  const window = normalizeWindow(data.scheduleStart, data.scheduleEnd);
  storeScheduleWindow(window);
  return window;
}

export function useScheduleWindow() {
  const [scheduleWindow, setScheduleWindow] = useState<ScheduleWindow>(getStoredScheduleWindow);

  useEffect(() => {
    fetchScheduleWindowFromServer().then(setScheduleWindow);
  }, []);

  useEffect(() => {
    const sync = () => setScheduleWindow(getStoredScheduleWindow());

    window.addEventListener("storage", sync);
    window.addEventListener(changeEvent, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changeEvent, sync);
    };
  }, []);

  return scheduleWindow;
}
