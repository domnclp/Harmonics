import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

type CompletionUpdate = {
  completed?: boolean;
  failureReason?: string | null;
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
      include: { instance: true }
    });
    if (!completion) throw new AppError(404, "Habit completion not found");

    const updated = await prisma.habitCompletion.update({
      where: { id },
      data: input
    });
    const completionPercentage = await updateInstanceCompletion(completion.instanceId);
    return { ...updated, instanceCompletionPercentage: completionPercentage };
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
  }
};
