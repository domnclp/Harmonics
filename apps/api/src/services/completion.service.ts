import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";
import { getHabitStreak } from "./habitStreak.service.js";

type CompletionUpdate = {
  completed?: boolean;
  failureReason?: string | null;
};

type TaskCreateInput = {
  title: string;
};

type InstanceCompletionUpdate = {
  completed: boolean;
  failureReason?: string | null;
  journalContent?: string;
};

const updateInstanceCompletion = async (instanceId: string) => {
  const [habits, tasks] = await Promise.all([
    prisma.habitCompletion.findMany({ where: { instanceId }, select: { completed: true } }),
    prisma.taskCompletion.findMany({ where: { instanceId }, select: { completed: true } })
  ]);
  const all = [...habits, ...tasks];
  const completed = all.filter((item) => item.completed).length;
  const completionPercentage = all.length ? Math.round((completed / all.length) * 100) : 0;

  await prisma.blockInstance.update({
    where: { id: instanceId },
    data: { completionPercentage }
  });

  return completionPercentage;
};

export const completionService = {
  async updateHabit(userId: string, id: string, input: CompletionUpdate) {
    const completion = await prisma.habitCompletion.findFirst({
      where: { id, instance: { userId } },
      include: {
        instance: {
          select: {
            userId: true,
            templateId: true,
            date: true
          }
        }
      }
    });
    if (!completion) throw new AppError(404, "Habit completion not found");

    const updated = await prisma.habitCompletion.update({
      where: { id },
      data: input
    });
    const completionPercentage = await updateInstanceCompletion(completion.instanceId);
    const streak = await getHabitStreak({ ...updated, instance: completion.instance });
    return { ...updated, streak, instanceCompletionPercentage: completionPercentage };
  },

  async updateTask(userId: string, id: string, input: CompletionUpdate) {
    const completion = await prisma.taskCompletion.findFirst({
      where: { id, instance: { userId } },
      include: { instance: true }
    });
    if (!completion) throw new AppError(404, "Task completion not found");

    const updated = await prisma.taskCompletion.update({
      where: { id },
      data: input
    });
    const completionPercentage = await updateInstanceCompletion(completion.instanceId);
    return { ...updated, instanceCompletionPercentage: completionPercentage };
  },

  async createTask(userId: string, instanceId: string, input: TaskCreateInput) {
    const instance = await prisma.blockInstance.findFirst({
      where: { id: instanceId, userId },
      select: { id: true }
    });
    if (!instance) throw new AppError(404, "Block instance not found");

    const created = await prisma.taskCompletion.create({
      data: {
        instanceId,
        title: input.title
      }
    });
    const completionPercentage = await updateInstanceCompletion(instanceId);
    return { ...created, instanceCompletionPercentage: completionPercentage };
  },

  async deleteTask(userId: string, id: string) {
    const completion = await prisma.taskCompletion.findFirst({
      where: { id, instance: { userId } },
      select: { id: true, instanceId: true }
    });
    if (!completion) throw new AppError(404, "Task completion not found");

    await prisma.taskCompletion.delete({ where: { id } });
    const completionPercentage = await updateInstanceCompletion(completion.instanceId);
    return { id, instanceId: completion.instanceId, completionPercentage };
  },

  async updateInstance(userId: string, instanceId: string, input: InstanceCompletionUpdate) {
    const instance = await prisma.blockInstance.findFirst({
      where: { id: instanceId, userId },
      select: { id: true }
    });
    if (!instance) throw new AppError(404, "Block instance not found");

    if (input.completed) {
      if (input.journalContent !== undefined) {
        await prisma.journalEntry.update({
          where: { instanceId },
          data: { content: input.journalContent }
        });
      }

      const completionPercentage = await updateInstanceCompletion(instanceId);
      return { instanceId, completionPercentage };
    }

    const completionPercentage = 0;
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.habitCompletion.updateMany({
          where: { instanceId },
          data: {
            completed: false,
            failureReason: input.failureReason ?? null
          }
        }),
        tx.taskCompletion.updateMany({
          where: { instanceId },
          data: {
            completed: false,
            failureReason: input.failureReason ?? null
          }
        }),
        tx.blockInstance.update({
          where: { id: instanceId },
          data: { completionPercentage }
        }),
        input.journalContent === undefined
          ? Promise.resolve()
          : tx.journalEntry.update({
              where: { instanceId },
              data: { content: input.journalContent }
            })
      ]);
    });

    return { instanceId, completionPercentage };
  }
};
