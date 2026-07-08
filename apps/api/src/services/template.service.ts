import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

type TemplateItemInput = { title: string; sortOrder?: number };

type TemplateInput = {
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  category: string;
  journalPrompt?: string | null;
  isTemporary?: boolean;
  habits?: TemplateItemInput[];
  tasks?: TemplateItemInput[];
};

const includeTemplateItems = {
  habits: { orderBy: { sortOrder: "asc" as const } },
  tasks: { orderBy: { sortOrder: "asc" as const } }
};

export const templateService = {
  list(userId: string) {
    return prisma.blockTemplate.findMany({
      where: {
        userId,
        isTemporary: false,
        category: { not: "Temporary" }
      },
      include: includeTemplateItems,
      orderBy: { updatedAt: "desc" }
    });
  },

  create(userId: string, input: TemplateInput) {
    return prisma.blockTemplate.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        category: input.category,
        journalPrompt: input.journalPrompt,
        isTemporary: input.isTemporary ?? false,
        habits: {
          create: (input.habits ?? []).map((habit, index) => ({
            title: habit.title,
            sortOrder: habit.sortOrder ?? index
          }))
        }
      },
      include: includeTemplateItems
    });
  },

  async get(userId: string, id: string) {
    const template = await prisma.blockTemplate.findFirst({
      where: { id, userId },
      include: includeTemplateItems
    });
    if (!template) throw new AppError(404, "Template not found");
    return template;
  },

  async update(userId: string, id: string, input: Partial<TemplateInput>) {
    await this.get(userId, id);

    return prisma.$transaction(async (tx) => {
      if (input.habits) {
        await tx.templateHabit.deleteMany({ where: { templateId: id } });
      }
      if (input.tasks) {
        await tx.templateTask.deleteMany({ where: { templateId: id } });
      }

      return tx.blockTemplate.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          category: input.category,
          journalPrompt: input.journalPrompt,
          habits: input.habits
            ? {
                create: input.habits.map((habit, index) => ({
                  title: habit.title,
                  sortOrder: habit.sortOrder ?? index
                }))
              }
            : undefined,
          tasks: undefined
        },
        include: includeTemplateItems
      });
    });
  },

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.$transaction(async (tx) => {
      await tx.blockInstance.deleteMany({ where: { userId, templateId: id } });
      await tx.scheduleBlock.deleteMany({ where: { userId, templateId: id } });
      await tx.blockTemplate.delete({ where: { id } });
    });
  }
};
