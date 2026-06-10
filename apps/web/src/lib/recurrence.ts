import type { ScheduleBlock } from "../types";
import { dayOfWeekMondayFirst } from "./date";

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

export const recurrenceOptions: { value: RecurrenceRule; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKDAYS", label: "Weekdays" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUALLY", label: "Semi-annually" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" }
];

const getAnchorDate = (block: ScheduleBlock) => {
  const value = block.date?.slice(0, 10);
  return value ? new Date(`${value}T00:00:00`) : null;
};

const monthDifference = (from: Date, to: Date) => (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();

const matchesMonthlyInterval = (block: ScheduleBlock, date: Date, intervalMonths: number) => {
  const anchor = getAnchorDate(block);
  if (!anchor || date < anchor || date.getDate() !== anchor.getDate()) return false;

  const diff = monthDifference(anchor, date);
  return diff >= 0 && diff % intervalMonths === 0;
};

export const blockOccursOnDate = (block: ScheduleBlock, dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = dayOfWeekMondayFirst(date);
  const rule = block.recurrenceRule as RecurrenceRule;
  const anchor = getAnchorDate(block);

  if (anchor && date < anchor) return false;

  switch (rule) {
    case "ONCE":
      return block.date?.slice(0, 10) === dateKey;
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return day >= 0 && day <= 4;
    case "MONTHLY":
      return matchesMonthlyInterval(block, date, 1);
    case "QUARTERLY":
      return matchesMonthlyInterval(block, date, 3);
    case "SEMI_ANNUALLY":
      return matchesMonthlyInterval(block, date, 6);
    case "YEARLY":
      return matchesMonthlyInterval(block, date, 12);
    case "WEEKLY":
    case "CUSTOM":
    default:
      return block.dayOfWeek === day;
  }
};
