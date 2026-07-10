export type WeekStartsOn = "monday" | "sunday";

export const minutesPerDay = 24 * 60;
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
  const normalizedMinutes = ((totalMinutes % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export const getLogicalMinutes = (time: string, dayStart = 0) => {
  const minutes = toMinutes(time);
  return minutes < dayStart ? minutes + minutesPerDay : minutes;
};

export const getLogicalEndMinutes = (startTime: string, endTime: string, dayStart = toMinutes(startTime)) => {
  const start = getLogicalMinutes(startTime, dayStart);
  const end = getLogicalMinutes(endTime, dayStart);
  return end <= start ? end + minutesPerDay : end;
};

export const getDurationMinutes = (startTime: string, endTime: string) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return end <= start ? end + minutesPerDay - start : end - start;
};

export const getScheduleDate = (date: Date, startTime: string, endTime: string) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const clockMinutes = date.getHours() * 60 + date.getMinutes();

  if (end > start || clockMinutes > end) return date;

  const previous = new Date(date);
  previous.setDate(date.getDate() - 1);
  return previous;
};

export const getTimeSlots = (startTime = "06:00", endTime = "23:00"): string[] => {
  const start = toMinutes(startTime);
  const end = getLogicalEndMinutes(startTime, endTime, start);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return getTimeSlots();

  return Array.from({ length: Math.floor((end - start) / 30) }, (_, index) => toTimeString(start + index * 30));
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
