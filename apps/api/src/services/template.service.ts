import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";
import { syncFutureInstancesForTemplate } from "./instanceSync.service.js";

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

/** Days of history scanned for the read-only task preview on a template card. */
const recentTaskLookbackDays = 14;

export const templateService = {
  async list(userId: string) {
    const templates = await prisma.blockTemplate.findMany({
      where: {
        userId,
        isTemporary: false,
        category: { not: "Temporary" }
      },
      include: includeTemplateItems,
      orderBy: { updatedAt: "desc" }
    });

    // Tasks are added per-day from the schedule or dashboard, so they live on
    // BlockInstance rather than the template. Surface the recent ones as a
    // read-only preview: one grouped query, not one per template.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - recentTaskLookbackDays);

    const recent = await prisma.taskCompletion.findMany({
      where: { instance: { userId, date: { gte: since } } },
      select: {
        title: true,
        completed: true,
        instance: { select: { templateId: true, date: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const byTemplate = new Map<string, Array<{ title: string; completed: boolean; date: Date }>>();
    for (const task of recent) {
      const list = byTemplate.get(task.instance.templateId) ?? [];
      // One row per title keeps a daily task from filling the card.
      if (list.length < 5 && !list.some((item) => item.title === task.title)) {
        list.push({ title: task.title, completed: task.completed, date: task.instance.date });
      }
      byTemplate.set(task.instance.templateId, list);
    }

    return templates.map((template) => ({
      ...template,
      recentTasks: byTemplate.get(template.id) ?? []
    }));
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
        },
        tasks: {
          create: (input.tasks ?? []).map((task, index) => ({
            title: task.title,
            sortOrder: task.sortOrder ?? index
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

    // Habits are reconciled by title rather than deleted and recreated. A
    // delete would cascade HabitCompletion.templateHabitId to null (SetNull),
    // orphaning rows that the instance sync would then mistake for user-added
    // one-offs — producing duplicates on every template edit.
    if (input.habits) {
      const existing = await prisma.templateHabit.findMany({
        where: { templateId: id },
        select: { id: true, title: true }
      });
      const keptIds = new Set<string>();
      const byTitle = new Map(existing.map((habit) => [habit.title, habit]));

      for (const [index, habit] of input.habits.entries()) {
        const match = byTitle.get(habit.title);
        const sortOrder = habit.sortOrder ?? index;

        if (match) {
          keptIds.add(match.id);
          await prisma.templateHabit.update({ where: { id: match.id }, data: { sortOrder } });
          byTitle.delete(habit.title);
        } else {
          const created = await prisma.templateHabit.create({
            data: { templateId: id, title: habit.title, sortOrder }
          });
          keptIds.add(created.id);
        }
      }

      const removed = existing.filter((habit) => !keptIds.has(habit.id)).map((habit) => habit.id);
      if (removed.length) {
        await prisma.templateHabit.deleteMany({ where: { id: { in: removed } } });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
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
          tasks: input.tasks
            ? {
                create: input.tasks.map((task, index) => ({
                  title: task.title,
                  sortOrder: task.sortOrder ?? index
                }))
              }
            : undefined
        },
        include: includeTemplateItems
      });
    });

    // Instances materialize their own habit rows, so today's and future days
    // would otherwise not show an edit until the block was re-added.
    if (input.habits) {
      await syncFutureInstancesForTemplate(userId, id);
    }

    return updated;
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
