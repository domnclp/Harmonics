import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";

type WeeklyBlockInstance = Prisma.BlockInstanceGetPayload<{
  include: { habitCompletions: true; taskCompletions: true };
}>;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const dateOnly = (date: string) => new Date(`${date}T00:00:00.000Z`);

export const analyticsService = {
  async weekly(userId: string, weekStart: string) {
    const start = dateOnly(weekStart);
    const end = addDays(start, 7);
    const instances: WeeklyBlockInstance[] = await prisma.blockInstance.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { habitCompletions: true, taskCompletions: true },
      orderBy: { date: "asc" }
    });

    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = date.toISOString().slice(0, 10);
      const items = instances.filter((instance) => instance.date.toISOString().slice(0, 10) === key);
      const completion = items.length
        ? Math.round(items.reduce((sum, item) => sum + item.completionPercentage, 0) / items.length)
        : 0;
      return { date: key, completion };
    });

    const overall = instances.length
      ? Math.round(instances.reduce((sum, instance) => sum + instance.completionPercentage, 0) / instances.length)
      : 0;

    const completedHabits = instances.flatMap((instance) => instance.habitCompletions).filter((item) => item.completed).length;
    const completedTasks = instances.flatMap((instance) => instance.taskCompletions).filter((item) => item.completed).length;

    return { overall, daily, completedHabits, completedTasks, totalBlocks: instances.length };
  },

  async templates(userId: string) {
    const instances = await prisma.blockInstance.findMany({
      where: { userId },
      include: { template: true }
    });

    const grouped = new Map<string, { templateId: string; name: string; total: number; sum: number }>();
    for (const instance of instances) {
      const item = grouped.get(instance.templateId) ?? {
        templateId: instance.templateId,
        name: instance.template.name,
        total: 0,
        sum: 0
      };
      item.total += 1;
      item.sum += instance.completionPercentage;
      grouped.set(instance.templateId, item);
    }

    const templates = [...grouped.values()].map((item) => ({
      templateId: item.templateId,
      name: item.name,
      completion: Math.round(item.sum / item.total),
      total: item.total
    }));

    const sorted = [...templates].sort((a, b) => b.completion - a.completion);
    return {
      templates,
      mostCompleted: sorted[0] ?? null,
      leastCompleted: sorted[sorted.length - 1] ?? null
    };
  },

  async failureReasons(userId: string) {
    const [habits, tasks] = await Promise.all([
      prisma.habitCompletion.findMany({
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        select: { title: true, failureReason: true }
      }),
      prisma.taskCompletion.findMany({
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        select: { title: true, failureReason: true }
      })
    ]);

    const reasons = new Map<string, number>();
    const skipped = new Map<string, number>();
    for (const item of [...habits, ...tasks]) {
      if (item.failureReason) reasons.set(item.failureReason, (reasons.get(item.failureReason) ?? 0) + 1);
      skipped.set(item.title, (skipped.get(item.title) ?? 0) + 1);
    }

    return {
      reasons: [...reasons.entries()].map(([name, value]) => ({ name, value })),
      skippedItems: [...skipped.entries()]
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }
};
