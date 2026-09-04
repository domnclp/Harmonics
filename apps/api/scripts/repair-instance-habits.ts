/**
 * Removes habit rows that belong to a template the instance no longer uses.
 *
 * Before instanceSync existed, pointing a ScheduleBlock at a different template
 * left the old template's HabitCompletion rows in place, so e.g. a Productive
 * Block showed Morning Routine's habits. This clears that residue.
 *
 * Deliberately narrow:
 *   - Only removes rows whose templateHabitId belongs to some OTHER template.
 *     Rows with a null templateHabitId are user-added one-offs and are kept.
 *   - Does NOT back-fill "missing" habits on past days. A habit added to a
 *     template last week was genuinely not part of an older day, and inventing
 *     it would fabricate history (and skew completion percentages).
 *   - Recomputes completionPercentage for every instance it touches, since
 *     removing rows changes the denominator.
 *
 * Run the audit first. Dry run by default:
 *   npx tsx scripts/repair-instance-habits.ts
 *   npx tsx scripts/repair-instance-habits.ts --apply
 */
import { prisma } from "../src/prisma/client.js";

const apply = process.argv.includes("--apply");

const main = async () => {
  const instances = await prisma.blockInstance.findMany({
    select: {
      id: true,
      date: true,
      completionPercentage: true,
      template: { select: { name: true, habits: { select: { id: true } } } },
      habitCompletions: {
        select: { id: true, templateHabitId: true, title: true, completed: true, failureReason: true }
      },
      taskCompletions: { select: { completed: true, failureReason: true } }
    },
    orderBy: { date: "asc" }
  });

  const repairs: Array<{
    id: string;
    dateKey: string;
    templateName: string;
    removeIds: string[];
    titles: string[];
    markedCount: number;
    nextPercentage: number;
  }> = [];

  for (const instance of instances) {
    const wanted = new Set(instance.template.habits.map((habit) => habit.id));
    const stale = instance.habitCompletions.filter(
      (row) => row.templateHabitId !== null && !wanted.has(row.templateHabitId)
    );

    if (!stale.length) continue;

    const staleIds = new Set(stale.map((row) => row.id));
    const keptHabits = instance.habitCompletions.filter((row) => !staleIds.has(row.id));
    const remaining = [...keptHabits, ...instance.taskCompletions];
    const completed = remaining.filter((row) => row.completed).length;
    const nextPercentage = remaining.length ? Math.round((completed / remaining.length) * 100) : 0;

    repairs.push({
      id: instance.id,
      dateKey: instance.date.toISOString().slice(0, 10),
      templateName: instance.template.name,
      removeIds: stale.map((row) => row.id),
      titles: stale.map((row) => row.title),
      markedCount: stale.filter((row) => row.completed || row.failureReason).length,
      nextPercentage
    });
  }

  if (!repairs.length) {
    console.log("Nothing to repair — every instance matches its template.");
    return;
  }

  console.log(apply ? "APPLYING repairs\n" : "DRY RUN — nothing will change\n");

  let removed = 0;
  let marked = 0;
  for (const repair of repairs) {
    removed += repair.removeIds.length;
    marked += repair.markedCount;
    console.log(`${repair.dateKey}  ${repair.templateName}`);
    console.log(`  removing ${repair.removeIds.length}: ${repair.titles.join(", ")}`);
    if (repair.markedCount) console.log(`  ${repair.markedCount} of these were already completed/marked`);
  }

  if (apply) {
    for (const repair of repairs) {
      await prisma.$transaction([
        prisma.habitCompletion.deleteMany({ where: { id: { in: repair.removeIds } } }),
        prisma.blockInstance.update({
          where: { id: repair.id },
          data: { completionPercentage: repair.nextPercentage }
        })
      ]);
    }
  }

  console.log("\n────────────────────────────────────");
  console.log(`instances repaired: ${repairs.length}`);
  console.log(`habit rows removed: ${removed}`);
  console.log(`of those, already completed/marked: ${marked}`);
  console.log(apply ? "\nApplied." : "\nDry run only. Re-run with --apply to make these changes.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
