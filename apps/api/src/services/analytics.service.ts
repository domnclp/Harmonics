import { prisma } from "../prisma/client.js";

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
    const [instances, completedHabits, completedTasks] = await Promise.all([
      prisma.blockInstance.findMany({
        where: { userId, date: { gte: start, lt: end } },
        select: { date: true, completionPercentage: true },
        orderBy: { date: "asc" }
      }),
      prisma.habitCompletion.count({
        where: { completed: true, instance: { userId, date: { gte: start, lt: end } } }
      }),
      prisma.taskCompletion.count({
        where: { completed: true, instance: { userId, date: { gte: start, lt: end } } }
      })
    ]);

    const dailyBuckets = new Map<string, { total: number; count: number }>();
    for (const instance of instances) {
      const key = instance.date.toISOString().slice(0, 10);
      const bucket = dailyBuckets.get(key) ?? { total: 0, count: 0 };
      bucket.total += instance.completionPercentage;
      bucket.count += 1;
      dailyBuckets.set(key, bucket);
    }

    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = date.toISOString().slice(0, 10);
      const bucket = dailyBuckets.get(key);
      const completion = bucket ? Math.round(bucket.total / bucket.count) : 0;
      return { date: key, completion };
    });

    const overall = instances.length
      ? Math.round(instances.reduce((sum, instance) => sum + instance.completionPercentage, 0) / instances.length)
      : 0;

    return { overall, daily, completedHabits, completedTasks, totalBlocks: instances.length };
  },

  async templates(userId: string) {
    const grouped = await prisma.blockInstance.groupBy({
      by: ["templateId"],
      where: { userId },
      _avg: { completionPercentage: true },
      _count: { _all: true }
    });

    const templateNames = await prisma.blockTemplate.findMany({
      where: { userId, id: { in: grouped.map((item) => item.templateId) } },
      select: { id: true, name: true }
    });
    const namesById = new Map(templateNames.map((template) => [template.id, template.name]));

    const templates = grouped.map((item) => ({
      templateId: item.templateId,
      name: namesById.get(item.templateId) ?? "Deleted template",
      completion: Math.round(item._avg.completionPercentage ?? 0),
      total: item._count._all
    }));

    const sorted = [...templates].sort((a, b) => b.completion - a.completion);
    return {
      templates,
      mostCompleted: sorted[0] ?? null,
      leastCompleted: sorted[sorted.length - 1] ?? null
    };
  },

  async failureReasons(userId: string) {
    const [habitReasons, taskReasons, habitSkipped, taskSkipped] = await Promise.all([
      prisma.habitCompletion.groupBy({
        by: ["failureReason"],
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        _count: { _all: true }
      }),
      prisma.taskCompletion.groupBy({
        by: ["failureReason"],
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        _count: { _all: true }
      }),
      prisma.habitCompletion.groupBy({
        by: ["title"],
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        _count: { _all: true }
      }),
      prisma.taskCompletion.groupBy({
        by: ["title"],
        where: { completed: false, failureReason: { not: null }, instance: { userId } },
        _count: { _all: true }
      })
    ]);

    const reasons = new Map<string, number>();
    const skipped = new Map<string, number>();
    for (const item of [...habitReasons, ...taskReasons]) {
      if (item.failureReason) reasons.set(item.failureReason, (reasons.get(item.failureReason) ?? 0) + item._count._all);
    }
    for (const item of [...habitSkipped, ...taskSkipped]) {
      skipped.set(item.title, (skipped.get(item.title) ?? 0) + item._count._all);
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
