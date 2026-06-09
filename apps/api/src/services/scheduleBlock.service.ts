import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

export type ScheduleBlockInput = {
  scheduleId: string;
  templateId: string;
  dayOfWeek: number;
  date?: string | null;
  startTime: string;
  endTime: string;
  recurrenceRule?: string;
};

const includeBlock = {
  template: true,
  schedule: true
};

export const scheduleBlockService = {
  list(userId: string) {
    return prisma.scheduleBlock.findMany({
      where: { userId },
      include: includeBlock,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
  },

  async create(userId: string, input: ScheduleBlockInput) {
    const [schedule, template] = await Promise.all([
      prisma.schedule.findFirst({ where: { id: input.scheduleId, userId } }),
      prisma.blockTemplate.findFirst({ where: { id: input.templateId, userId } })
    ]);

    if (!schedule) throw new AppError(404, "Schedule not found");
    if (!template) throw new AppError(404, "Template not found");

    return prisma.scheduleBlock.create({
      data: {
        userId,
        scheduleId: input.scheduleId,
        templateId: input.templateId,
        dayOfWeek: input.dayOfWeek,
        date: input.date ? new Date(`${input.date}T00:00:00.000Z`) : null,
        startTime: input.startTime,
        endTime: input.endTime,
        recurrenceRule: input.recurrenceRule ?? "WEEKLY"
      },
      include: includeBlock
    });
  },

  createMany(userId: string, inputs: ScheduleBlockInput[]) {
    return Promise.all(inputs.map((input) => this.create(userId, input)));
  },

  async get(userId: string, id: string) {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id, userId },
      include: includeBlock
    });
    if (!block) throw new AppError(404, "Schedule block not found");
    return block;
  },

  async update(userId: string, id: string, input: Partial<ScheduleBlockInput>) {
    await this.get(userId, id);

    if (input.scheduleId) {
      const schedule = await prisma.schedule.findFirst({ where: { id: input.scheduleId, userId } });
      if (!schedule) throw new AppError(404, "Schedule not found");
    }

    if (input.templateId) {
      const template = await prisma.blockTemplate.findFirst({ where: { id: input.templateId, userId } });
      if (!template) throw new AppError(404, "Template not found");
    }

    return prisma.scheduleBlock.update({
      where: { id },
      data: {
        ...input,
        date: input.date ? new Date(`${input.date}T00:00:00.000Z`) : input.date
      },
      include: includeBlock
    });
  },

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.scheduleBlock.delete({ where: { id } });
  }
};
