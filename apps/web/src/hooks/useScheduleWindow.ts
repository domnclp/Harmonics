import { useEffect, useState } from "react";

const startKey = "scheduleStart";
const endKey = "scheduleEnd";
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

export const getStoredScheduleWindow = () => {
  if (typeof window === "undefined") return defaultWindow;
  return normalizeWindow(localStorage.getItem(startKey), localStorage.getItem(endKey));
};

export const saveScheduleWindow = (windowValue: ScheduleWindow) => {
  const normalized = normalizeWindow(windowValue.startTime, windowValue.endTime);
  localStorage.setItem(startKey, normalized.startTime);
  localStorage.setItem(endKey, normalized.endTime);
  window.dispatchEvent(new Event(changeEvent));
};

export function useScheduleWindow() {
  const [scheduleWindow, setScheduleWindow] = useState<ScheduleWindow>(getStoredScheduleWindow);

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
