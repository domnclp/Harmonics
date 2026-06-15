export type WeekStartsOn = "monday" | "sunday";

const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const sundayFirstDayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getDayOptions = (weekStartsOn: WeekStartsOn = "monday") => {
  const labels = weekStartsOn === "sunday" ? sundayFirstDayLabels : dayLabels;
  return labels.map((label) => ({
    label,
    dayOfWeek: label === "Sunday" ? 6 : dayLabels.indexOf(label)
  }));
};

const toTimeString = (totalMinutes: number) => {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export const getTimeSlots = (startTime = "06:00", endTime = "23:00"): string[] => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return getTimeSlots();

  return Array.from({ length: Math.floor((end - start) / 30) + 1 }, (_, index) => toTimeString(start + index * 30));
};

export const formatTime = (time: string, use24Hour = false) => {
  if (use24Hour) return time;
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

const getMonday = (date = new Date()) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const getWeekStart = (date = new Date(), weekStartsOn: WeekStartsOn = "monday") => {
  if (weekStartsOn === "monday") return getMonday(date);

  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday;
};

export const getDateForDayOfWeek = (weekStart: Date, dayOfWeek: number, weekStartsOn: WeekStartsOn = "monday") => {
  const offset = weekStartsOn === "sunday" ? (dayOfWeek === 6 ? 0 : dayOfWeek + 1) : dayOfWeek;
  return addDays(weekStart, offset);
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

export const toDateKey = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const dayOfWeekMondayFirst = (date = new Date()) => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};
