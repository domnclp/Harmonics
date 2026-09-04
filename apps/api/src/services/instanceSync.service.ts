import { prisma } from "../prisma/client.js";

/**
 * Reconciles a materialized BlockInstance's habit rows against its template.
 *
 * blockInstanceService.findOrCreate copies template.habits into HabitCompletion
 * rows once, when a day's block is first opened, and returns early on every
 * later read. That snapshot is deliberate — it is what lets a completed day stay
 * accurate after a template is edited — but it leaves two visible bugs:
 *
 *   1. Changing a block's template kept the old template's habits, because
 *      scheduleBlockService.update propagated only startTime/endTime.
 *   2. Adding a habit to a template did not appear on already-materialized days,
 *      so it only showed up the following week.
 *
 * Reconciling by templateHabitId rather than replacing wholesale is what keeps
 * this safe: rows the user has already ticked keep their completed state and
 * failureReason, so a sync can never silently erase progress.
 *
 * Only future and current days are synced — see syncFutureInstancesForTemplate.
 */
export const syncInstanceHabits = async (instanceId: string, templateId: string) => {
  const [instance, habits] = await Promise.all([
    prisma.blockInstance.findUnique({
      where: { id: instanceId },
      select: { id: true, habitCompletions: { select: { id: true, templateHabitId: true, title: true } } }
    }),
    prisma.templateHabit.findMany({
      where: { templateId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true }
    })
  ]);

  if (!instance) return;

  const existingByHabitId = new Map(
    instance.habitCompletions
      .filter((row) => row.templateHabitId !== null)
      .map((row) => [row.templateHabitId as string, row])
  );
  const wantedIds = new Set(habits.map((habit) => habit.id));

  // Rows whose template habit is gone (deleted, or belonging to the previous
  // template after a swap). Rows with a null templateHabitId are user-added
  // one-offs from the day view and must survive.
  const stale = instance.habitCompletions.filter(
    (row) => row.templateHabitId !== null && !wantedIds.has(row.templateHabitId)
  );

  const missing = habits.filter((habit) => !existingByHabitId.has(habit.id));

  // Titles can be edited on the template after materialization.
  const renamed = habits
    .map((habit) => ({ habit, row: existingByHabitId.get(habit.id) }))
    .filter((pair) => pair.row && pair.row.title !== pair.habit.title);

  if (!stale.length && !missing.length && !renamed.length) return;

  await prisma.$transaction([
    ...(stale.length
      ? [prisma.habitCompletion.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })]
      : []),
    ...(missing.length
      ? [
          prisma.habitCompletion.createMany({
            data: missing.map((habit) => ({
              instanceId: instance.id,
              templateHabitId: habit.id,
              title: habit.title
            }))
          })
        ]
      : []),
    ...renamed.map((pair) =>
      prisma.habitCompletion.update({ where: { id: pair.row!.id }, data: { title: pair.habit.title } })
    )
  ]);
};

/**
 * Re-syncs every materialized instance of one schedule block. Used when a block
 * is pointed at a different template.
 */
export const syncInstancesForBlock = async (scheduleBlockId: string, templateId: string) => {
  const instances = await prisma.blockInstance.findMany({
    where: { scheduleBlockId, date: { gte: startOfToday() } },
    select: { id: true }
  });

  await prisma.blockInstance.updateMany({ where: { scheduleBlockId }, data: { templateId } });

  for (const instance of instances) {
    await syncInstanceHabits(instance.id, templateId);
  }
};

/**
 * Past days are deliberately excluded: they are a record of what actually
 * happened, and editing a template should never rewrite history. Comparing
 * against UTC midnight matches how instance dates are stored (toDateOnly).
 */
const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Re-syncs today's and future instances that use a template, after the
 * template's habits are edited.
 */
export const syncFutureInstancesForTemplate = async (userId: string, templateId: string) => {
  const instances = await prisma.blockInstance.findMany({
    where: { userId, templateId, date: { gte: startOfToday() } },
    select: { id: true }
  });

  for (const instance of instances) {
    await syncInstanceHabits(instance.id, templateId);
  }
};
