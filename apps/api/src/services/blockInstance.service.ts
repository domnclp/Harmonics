import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";
import { withHabitStreaks } from "./habitStreak.service.js";

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

export const blockInstanceService = {
  async listByDate(userId: string, date: string) {
    const instances = await prisma.blockInstance.findMany({
      where: { userId, date: toDateOnly(date) },
      include: includeInstance,
      orderBy: { startTime: "asc" }
    });

    return Promise.all(instances.map(addHabitStreaks));
  },

  async findOrCreate(userId: string, scheduleBlockId: string, date: string) {
    const dateOnly = toDateOnly(date);
    const existing = await prisma.blockInstance.findFirst({
      where: { userId, scheduleBlockId, date: dateOnly },
      include: includeInstance
    });

    if (existing) return addHabitStreaks(existing);

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
