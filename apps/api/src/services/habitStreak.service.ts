import { prisma } from "../prisma/client.js";

type HabitForStreak = {
  id: string;
  instanceId: string;
  templateHabitId: string | null;
  title: string;
  completed: boolean;
  instance: {
    userId: string;
    templateId: string;
    date: Date;
  };
};

type HabitWithStreak<T> = T & {
  streak: number;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const previousDateKey = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateKey(date);
};

export const getHabitStreak = async (habit: HabitForStreak) => {
  if (!habit.completed) return 0;

  const history = await prisma.habitCompletion.findMany({
    where: {
      completed: true,
      instance: {
        userId: habit.instance.userId,
        date: { lte: habit.instance.date }
      },
      ...(habit.templateHabitId
        ? { templateHabitId: habit.templateHabitId }
        : {
            templateHabitId: null,
            title: habit.title,
            instance: {
              userId: habit.instance.userId,
              templateId: habit.instance.templateId,
              date: { lte: habit.instance.date }
            }
          })
    },
    select: {
      instance: {
        select: { date: true }
      }
    },
    orderBy: {
      instance: { date: "desc" }
    }
  });

  const completedDates = new Set(history.map((item) => toDateKey(item.instance.date)));
  let cursor = toDateKey(habit.instance.date);
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
};

export const withHabitStreaks = async <T extends HabitForStreak>(habits: T[]): Promise<Array<HabitWithStreak<T>>> => {
  const streaks = await Promise.all(habits.map((habit) => getHabitStreak(habit)));
  return habits.map((habit, index) => ({ ...habit, streak: streaks[index] ?? 0 }));
};

export type UserHabitStreak = {
  key: string;
  title: string;
  streak: number;
};

/**
 * Every current habit streak for a user, in ONE query.
 *
 * getHabitStreak/withHabitStreaks issue a query per habit with unbounded
 * history, which is fine for a single request but becomes N+1 when the
 * scheduler fans out over a day's blocks. This groups in memory instead and
 * bounds the lookback, since no streak worth notifying about exceeds it.
 *
 * Keep the day-walk semantics in sync with getHabitStreak above.
 */
export const getUserHabitStreaks = async (
  userId: string,
  dateKey: string,
  lookbackDays = 90
): Promise<Map<string, UserHabitStreak>> => {
  const end = new Date(`${dateKey}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - lookbackDays);

  const history = await prisma.habitCompletion.findMany({
    where: {
      completed: true,
      instance: { userId, date: { gte: start, lte: end } }
    },
    select: {
      templateHabitId: true,
      title: true,
      instance: { select: { templateId: true, date: true } }
    }
  });

  // Group by the same identity rule getHabitStreak uses: templateHabitId when
  // present, else the template+title pair for ad-hoc items.
  const groups = new Map<string, { title: string; dates: Set<string> }>();
  for (const item of history) {
    const key = item.templateHabitId ?? `${item.instance.templateId}:${item.title}`;
    const group = groups.get(key) ?? { title: item.title, dates: new Set<string>() };
    group.dates.add(toDateKey(item.instance.date));
    groups.set(key, group);
  }

  const streaks = new Map<string, UserHabitStreak>();
  for (const [key, group] of groups) {
    let cursor = dateKey;
    let streak = 0;

    while (group.dates.has(cursor)) {
      streak += 1;
      cursor = previousDateKey(cursor);
    }

    if (streak > 0) streaks.set(key, { key, title: group.title, streak });
  }

  return streaks;
};
