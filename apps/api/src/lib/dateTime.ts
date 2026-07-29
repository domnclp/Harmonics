// Time helpers for the notification scheduler. The scheduler ticks in server
// time but must reason in each user's local wall-clock time, since ScheduleBlock
// startTime/endTime are bare "HH:mm" strings with no zone attached.

export type ZonedNow = {
  /** Local calendar date as YYYY-MM-DD. */
  dateKey: string;
  /** Local wall-clock time as zero-padded "HH:mm". */
  hhmm: string;
  /** Minutes since local midnight. */
  minutes: number;
};

// Matches toMinutes in apps/web/src/lib/date.ts.
export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const pad = (value: number) => value.toString().padStart(2, "0");

/**
 * Resolve `now` into a user's local date/time.
 *
 * Uses hourCycle "h23" rather than hour12:false — the latter renders midnight as
 * "24" under some ICU versions. Invalid IANA zones make Intl throw, so this
 * falls back to UTC rather than letting one bad row abort the whole tick.
 */
export const nowInZone = (now: Date, timeZone: string): ZonedNow => {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timeZone);
  } catch {
    parts = format("UTC");
  }

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number.parseInt(get("hour"), 10);
  const minute = Number.parseInt(get("minute"), 10);

  return {
    dateKey: `${year}-${month}-${day}`,
    hhmm: `${pad(hour)}:${pad(minute)}`,
    minutes: hour * 60 + minute
  };
};

/**
 * Shift an "HH:mm" by `delta` minutes, returning null if it would cross midnight.
 *
 * Crossing days would mean a heads-up for a 00:15 block belonging to the previous
 * calendar day, which breaks the dateKey-based dedupe. Skipping is the honest
 * behaviour for that edge case.
 */
export const shiftMinutesWithinDay = (time: string, delta: number): number | null => {
  const target = toMinutes(time) + delta;
  return target < 0 || target >= 24 * 60 ? null : target;
};

/**
 * Whether `minutes` falls inside a wall-clock window, handling windows that wrap
 * past midnight (Harmonics explicitly supports overnight schedule windows, so
 * end < start is legal and must not be treated as an empty range).
 */
export const isWithinWindow = (minutes: number, startTime: string, endTime: string) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
};
