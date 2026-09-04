import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";
import { syncInstancesForBlock } from "./instanceSync.service.js";

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
  template: {
    include: {
      habits: { orderBy: { sortOrder: "asc" as const } },
      tasks: { orderBy: { sortOrder: "asc" as const } }
    }
  },
  schedule: true
};

const toDateOnly = (date?: string | null) => (date ? new Date(`${date}T00:00:00.000Z`) : null);

const assertNoDuplicate = async (
  userId: string,
  input: { templateId: string; dayOfWeek: number; startTime: string; endTime: string; recurrenceRule?: string; date?: string | null },
  excludeId?: string
) => {
  const existing = await prisma.scheduleBlock.findFirst({
    where: {
      userId,
      templateId: input.templateId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      recurrenceRule: input.recurrenceRule ?? "WEEKLY",
      date: toDateOnly(input.date),
      id: excludeId ? { not: excludeId } : undefined
    }
  });

  if (existing) {
    throw new AppError(409, "An identical schedule block already exists for this day and time");
  }
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

    await assertNoDuplicate(userId, input);

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

  async createMany(userId: string, inputs: ScheduleBlockInput[]) {
    if (inputs.length === 0) return [];

    const scheduleIds = [...new Set(inputs.map((input) => input.scheduleId))];
    const templateIds = [...new Set(inputs.map((input) => input.templateId))];

    const [schedules, templates] = await Promise.all([
      prisma.schedule.findMany({
        where: { userId, id: { in: scheduleIds } },
        select: { id: true }
      }),
      prisma.blockTemplate.findMany({
        where: { userId, id: { in: templateIds } },
        select: { id: true }
      })
    ]);

    const foundScheduleIds = new Set(schedules.map((schedule) => schedule.id));
    const foundTemplateIds = new Set(templates.map((template) => template.id));

    if (scheduleIds.some((id) => !foundScheduleIds.has(id))) {
      throw new AppError(404, "Schedule not found");
    }

    if (templateIds.some((id) => !foundTemplateIds.has(id))) {
      throw new AppError(404, "Template not found");
    }

    const seen = new Set<string>();
    for (const input of inputs) {
      const key = [input.templateId, input.dayOfWeek, input.startTime, input.endTime, input.recurrenceRule ?? "WEEKLY", input.date ?? ""].join("|");
      if (seen.has(key)) {
        throw new AppError(409, "Duplicate schedule blocks in the same request");
      }
      seen.add(key);
    }

    await Promise.all(inputs.map((input) => assertNoDuplicate(userId, input)));

    return prisma.$transaction(
      inputs.map((input) =>
        prisma.scheduleBlock.create({
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
        })
      )
    );
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
    const current = await this.get(userId, id);

    if (input.scheduleId) {
      const schedule = await prisma.schedule.findFirst({ where: { id: input.scheduleId, userId } });
      if (!schedule) throw new AppError(404, "Schedule not found");
    }

    if (input.templateId) {
      const template = await prisma.blockTemplate.findFirst({ where: { id: input.templateId, userId } });
      if (!template) throw new AppError(404, "Template not found");
    }

    await assertNoDuplicate(
      userId,
      {
        templateId: input.templateId ?? current.templateId,
        dayOfWeek: input.dayOfWeek ?? current.dayOfWeek,
        startTime: input.startTime ?? current.startTime,
        endTime: input.endTime ?? current.endTime,
        recurrenceRule: input.recurrenceRule ?? current.recurrenceRule,
        date: input.date !== undefined ? input.date : current.date?.toISOString().slice(0, 10)
      },
      id
    );

    const updatedBlock = await prisma.scheduleBlock.update({
      where: { id },
      data: {
        ...input,
        date: input.date ? new Date(`${input.date}T00:00:00.000Z`) : input.date
      },
      include: includeBlock
    });

    if (input.startTime || input.endTime) {
      const instanceUpdateData: Record<string, string> = {};
      if (input.startTime) instanceUpdateData.startTime = input.startTime;
      if (input.endTime) instanceUpdateData.endTime = input.endTime;

      await prisma.blockInstance.updateMany({
        where: { scheduleBlockId: id },
        data: instanceUpdateData
      });
    }

    // Materialized instances hold their own copy of the template's habits, so
    // pointing the block at a different template would otherwise leave the old
    // template's checklist in place.
    if (input.templateId && input.templateId !== current.templateId) {
      await syncInstancesForBlock(id, input.templateId);
    }

    return updatedBlock;
  },

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.scheduleBlock.delete({ where: { id } });
  }
};
