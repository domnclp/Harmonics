import { useEffect, useState } from "react";
import type { WeekStartsOn } from "../lib/date";

const storageKey = "weekStartsOn";

export const getStoredWeekStartsOn = (): WeekStartsOn => {
  if (typeof window === "undefined") return "monday";
  return localStorage.getItem(storageKey) === "sunday" ? "sunday" : "monday";
};

export const saveWeekStartsOn = (value: WeekStartsOn) => {
  localStorage.setItem(storageKey, value);
  window.dispatchEvent(new Event("weekStartsOnChange"));
};

export function useWeekStartsOn() {
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(getStoredWeekStartsOn);

  useEffect(() => {
    const sync = () => setWeekStartsOn(getStoredWeekStartsOn());

    window.addEventListener("storage", sync);
    window.addEventListener("weekStartsOnChange", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("weekStartsOnChange", sync);
    };
  }, []);

  return weekStartsOn;
}
