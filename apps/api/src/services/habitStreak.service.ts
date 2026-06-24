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
