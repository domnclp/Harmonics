import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

export const scheduleService = {
  list(userId: string) {
    return prisma.schedule.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });
  },

  create(userId: string, name: string) {
    return prisma.schedule.create({
      data: { userId, name }
    });
  },

  async get(userId: string, id: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId },
      include: { scheduleBlocks: { include: { template: true } } }
    });
    if (!schedule) throw new AppError(404, "Schedule not found");
    return schedule;
  },

  async update(userId: string, id: string, name: string) {
    await this.get(userId, id);
    return prisma.schedule.update({
      where: { id },
      data: { name }
    });
  },

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.schedule.delete({ where: { id } });
  }
};
