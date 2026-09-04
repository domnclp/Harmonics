import { prisma } from "../prisma/client.js";

/**
 * Past days are deliberately excluded from every sync: they are a record of
 * what actually happened, and editing a template should never rewrite history.
 * Comparing against UTC midnight matches how instance dates are stored
 * (toDateOnly).
 */
const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Reconciles a stored BlockInstance's habit rows against a template.
 *
 * Called on READ from blockInstanceService.getForDate, which is what makes it
 * reliable: correctness no longer depends on every write path remembering to
 * sync. A day the user has never marked is not stored at all — it is derived
 * live from the template — so this only ever runs for days holding real data.
 *
 * Reconciling by templateHabitId rather than replacing wholesale is what keeps
 * this safe: rows the user has already ticked keep their completed state and
 * failureReason, so a sync can never silently erase progress. Rows with a null
 * templateHabitId are the user's own one-off additions and always survive.
 *
 * Pass `date` to enforce the past-day guard; omit it when the caller has
 * already filtered by date.
 */
export const syncInstanceHabits = async (instanceId: string, templateId: string, date?: Date) => {
  // Past days record what actually happened; reconciling them would rewrite
  // history and change completion percentages after the fact.
  if (date && date < startOfToday()) return;

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
