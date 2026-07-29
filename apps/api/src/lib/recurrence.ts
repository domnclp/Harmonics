// Mirrors apps/web/src/lib/recurrence.ts — keep in sync.
//
// Two deliberate differences from the web copy:
//
// 1. All date math here is UTC (`T00:00:00.000Z`, `getUTC*`). The web copy parses
//    and reads local time. Each copy is internally consistent, so both agree on
//    the same dateKey; mixing them is what produces off-by-one-day bugs, since
//    Prisma returns `@db.Date` values at UTC midnight.
// 2. The input type is structural so Prisma rows (`date: Date | null`) work
//    directly alongside API payloads (`date: string | null`).
//
// `dayOfWeek` is MONDAY-FIRST (0 = Monday .. 6 = Sunday), matching
// ScheduleBlock.dayOfWeek and UserSettings.activeDays. This is NOT the
// Sunday-first convention of Date#getUTCDay() — note that
// analytics.controller.ts uses Sunday-first for an unrelated purpose.

export type RecurrenceRule =
  | "YEARLY"
  | "SEMI_ANNUALLY"
  | "QUARTERLY"
  | "MONTHLY"
  | "WEEKLY"
  | "DAILY"
  | "WEEKDAYS"
  | "CUSTOM"
  | "ONCE";

export type RecurringBlock = {
  dayOfWeek: number;
  date: Date | string | null;
  recurrenceRule: string;
};

const toDateKey = (value: Date | string) =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const parseDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);

export const dayOfWeekMondayFirst = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
};

const getAnchorDate = (block: RecurringBlock) => {
  if (!block.date) return null;
  return parseDateKey(toDateKey(block.date));
};

const monthDifference = (from: Date, to: Date) =>
  (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();

const matchesMonthlyInterval = (block: RecurringBlock, date: Date, intervalMonths: number) => {
  const anchor = getAnchorDate(block);
  if (!anchor || date < anchor || date.getUTCDate() !== anchor.getUTCDate()) return false;

  const diff = monthDifference(anchor, date);
  return diff >= 0 && diff % intervalMonths === 0;
};

export const blockOccursOnDate = (block: RecurringBlock, dateKey: string, activeDays?: number[]) => {
  const date = parseDateKey(dateKey);
  const day = dayOfWeekMondayFirst(date);
  const rule = (block.recurrenceRule as RecurrenceRule)?.trim();
  const anchor = getAnchorDate(block);

  if (activeDays && !activeDays.includes(day)) return false;
  if (anchor && date < anchor) return false;

  switch (rule) {
    case "ONCE":
      return block.date ? toDateKey(block.date) === dateKey : false;
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return day >= 0 && day <= 4;
    case "MONTHLY":
      return matchesMonthlyInterval(block, date, 1) && day === block.dayOfWeek;
    case "QUARTERLY":
      return matchesMonthlyInterval(block, date, 3) && day === block.dayOfWeek;
    case "SEMI_ANNUALLY":
      return matchesMonthlyInterval(block, date, 6) && day === block.dayOfWeek;
    case "YEARLY":
      return matchesMonthlyInterval(block, date, 12) && day === block.dayOfWeek;
    case "WEEKLY":
    case "CUSTOM":
    default:
      return block.dayOfWeek === day;
  }
};

// Matches parseActiveDays in apps/web/src/hooks/useActiveDays.ts.
const allDays = [0, 1, 2, 3, 4, 5, 6];

export const parseActiveDays = (value: string | null | undefined): number[] => {
  if (!value) return allDays;

  const days = value
    .split(",")
    .map((day) => Number.parseInt(day, 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);

  return unique.length ? unique : allDays;
};
