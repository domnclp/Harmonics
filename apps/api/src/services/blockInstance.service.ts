import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

const includeInstance = {
  scheduleBlock: { include: { template: true } },
  template: true,
  habitCompletions: { orderBy: { createdAt: "asc" as const } },
  taskCompletions: { orderBy: { createdAt: "asc" as const } },
  journalEntry: true
};

const toDateOnly = (date: string) => new Date(`${date}T00:00:00.000Z`);

export const blockInstanceService = {
  listByDate(userId: string, date: string) {
    return prisma.blockInstance.findMany({
      where: { userId, date: toDateOnly(date) },
      include: includeInstance,
      orderBy: { startTime: "asc" }
    });
  },

  async findOrCreate(userId: string, scheduleBlockId: string, date: string) {
    const dateOnly = toDateOnly(date);
    const existing = await prisma.blockInstance.findFirst({
      where: { userId, scheduleBlockId, date: dateOnly },
      include: includeInstance
    });

    if (existing) return existing;

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

    return prisma.blockInstance.create({
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
        taskCompletions: {
          create: scheduleBlock.template.tasks.map((task) => ({
            templateTaskId: task.id,
            title: task.title
          }))
        },
        journalEntry: {
          create: { content: "" }
        }
      },
      include: includeInstance
    });
  }
};
