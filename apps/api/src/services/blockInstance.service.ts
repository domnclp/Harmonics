import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";
import { withHabitStreaks } from "./habitStreak.service.js";
import { syncInstanceHabits } from "./instanceSync.service.js";

const includeInstance = {
  scheduleBlock: { include: { template: true } },
  template: true,
  habitCompletions: {
    orderBy: { createdAt: "asc" as const },
    include: {
      instance: {
        select: {
          userId: true,
          templateId: true,
          date: true
        }
      }
    }
  },
  taskCompletions: { orderBy: { createdAt: "asc" as const } },
  journalEntry: true
};

const toDateOnly = (date: string) => new Date(`${date}T00:00:00.000Z`);

/**
 * Marks a habit row that exists only in memory, on a day the user has not
 * marked yet. The client sends it back when ticking, which tells the write path
 * to materialize the day first.
 */
export const derivedPrefix = "derived:";

type InstanceWithHabits = {
  habitCompletions: Array<{
    id: string;
    instanceId: string;
    templateHabitId: string | null;
    title: string;
    completed: boolean;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    instance: {
      userId: string;
      templateId: string;
      date: Date;
    };
  }>;
};

const addHabitStreaks = async <T extends InstanceWithHabits>(instance: T) => ({
  ...instance,
  habitCompletions: await withHabitStreaks(instance.habitCompletions)
});

/**
 * Builds an in-memory day for a block that has never been marked, shaped like a
 * stored instance so callers need no special case beyond `id === null`.
 *
 * Nothing here is written. The habits come straight from the block's current
 * template, so an untouched day always reflects the latest edit.
 */
const deriveInstance = async (userId: string, scheduleBlockId: string, dateOnly: Date) => {
  const block = await prisma.scheduleBlock.findFirst({
    where: { id: scheduleBlockId, userId },
    include: {
      template: {
        include: {
          habits: { orderBy: { sortOrder: "asc" } },
          tasks: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });

  if (!block) throw new AppError(404, "Schedule block not found");

  const now = new Date();
  const habitCompletions = block.template.habits.map((habit) => ({
    id: `${derivedPrefix}${habit.id}`,
    instanceId: "",
    templateHabitId: habit.id,
    title: habit.title,
    completed: false,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    // Streaks read these; the date is what getHabitStreak walks back from.
    instance: { userId, templateId: block.templateId, date: dateOnly }
  }));

  return {
    id: null,
    userId,
    scheduleBlockId,
    templateId: block.templateId,
    date: dateOnly,
    startTime: block.startTime,
    endTime: block.endTime,
    completionPercentage: 0,
    createdAt: now,
    updatedAt: now,
    scheduleBlock: block,
    template: block.template,
    habitCompletions: await withHabitStreaks(habitCompletions),
    taskCompletions: [],
    journalEntry: null
  };
};

export const blockInstanceService = {
  async listByDate(userId: string, date: string) {
    const instances = await prisma.blockInstance.findMany({
      where: { userId, date: toDateOnly(date) },
      include: includeInstance,
      orderBy: { startTime: "asc" }
    });

    return Promise.all(instances.map(addHabitStreaks));
  },

  /**
   * Reads a day WITHOUT writing to it.
   *
   * A day the user has never touched has nothing worth recording, so it is
   * derived live from the block's template rather than stored. Derived data
   * cannot go stale, which is what makes "habits carried over after changing a
   * template" structurally impossible instead of merely fixed.
   *
   * A day that IS stored gets reconciled against the block's template first —
   * see syncInstanceHabits, which skips past days so history stays truthful.
   *
   * Returns `id: null` for a derived day: nothing is persisted until the user
   * actually marks something, at which point `materialize` runs.
   */
  async getForDate(userId: string, scheduleBlockId: string, date: string) {
    const dateOnly = toDateOnly(date);
    const existing = await prisma.blockInstance.findFirst({
      where: { userId, scheduleBlockId, date: dateOnly },
      select: { id: true, scheduleBlock: { select: { templateId: true } } }
    });

    if (existing) {
      // The block is the source of truth for which template applies. Doing this
      // on read means no write path can forget to sync.
      await syncInstanceHabits(existing.id, existing.scheduleBlock.templateId, dateOnly);

      const fresh = await prisma.blockInstance.findUnique({
        where: { id: existing.id },
        include: includeInstance
      });
      if (fresh) return addHabitStreaks(fresh);
    }

    return deriveInstance(userId, scheduleBlockId, dateOnly);
  },

  /**
   * Ensures a day is stored, so something can be recorded against it. Call this
   * from write paths only — `getForDate` is the read path and deliberately does
   * not persist. Materializing is idempotent: an existing day is returned as-is.
   */
  async materialize(userId: string, scheduleBlockId: string, date: string) {
    return this.findOrCreate(userId, scheduleBlockId, date);
  },

  async findOrCreate(userId: string, scheduleBlockId: string, date: string) {
    const dateOnly = toDateOnly(date);
    const existing = await prisma.blockInstance.findFirst({
      where: { userId, scheduleBlockId, date: dateOnly },
      include: includeInstance
    });

    if (existing) {
      await syncInstanceHabits(existing.id, existing.scheduleBlock.templateId, dateOnly);
      const fresh = await prisma.blockInstance.findUnique({
        where: { id: existing.id },
        include: includeInstance
      });
      return addHabitStreaks(fresh ?? existing);
    }

    const scheduleBlock = await prisma.scheduleBlock.findFirst({
      where: { id: scheduleBlockId, userId },
      include: {
        template: {
          include: {
            habits: { orderBy: { sortOrder: "asc" } },
            tasks: { orderBy: { sortOrder: "asc" } }
          }
        }
      }
    });

    if (!scheduleBlock) throw new AppError(404, "Schedule block not found");

    const created = await prisma.blockInstance.create({
      data: {
        userId,
        scheduleBlockId,
        templateId: scheduleBlock.templateId,
        date: dateOnly,
        startTime: scheduleBlock.startTime,
        endTime: scheduleBlock.endTime,
        completionPercentage: 0,
        habitCompletions: {
          create: scheduleBlock.template.habits.map((habit) => ({
            templateHabitId: habit.id,
            title: habit.title
          }))
        },
        journalEntry: {
          create: { content: "" }
        }
      },
      include: includeInstance
    });

    return addHabitStreaks(created);
  }
};
