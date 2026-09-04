/**
 * Realigns materialized instances with the template their block now points at.
 *
 * Before instanceSync existed, repointing a ScheduleBlock at a different
 * template left the instance behind in two separate ways, and an instance can
 * have either or both:
 *
 *   1. Drifted templateId — the instance still records the OLD template, so the
 *      block renders under a new name while the instance keeps the old habits.
 *      This is the case that survived the first repair pass: comparing habits
 *      against instance.template made everything look consistent, because both
 *      sides were stale together. The block is the source of truth here.
 *   2. Foreign habit rows — rows whose templateHabitId belongs to a template
 *      the instance no longer uses.
 *
 * Deliberately narrow:
 *   - Rows with a null templateHabitId are user-added one-offs and are kept.
 *   - Does NOT back-fill "missing" habits on past days. A habit added to a
 *     template last week was genuinely not part of an older day, and inventing
 *     it would fabricate history (and skew completion percentages).
 *   - Recomputes completionPercentage for every instance it touches, since
 *     removing rows changes the denominator.
 *
 * Dry run by default:
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
      templateId: true,
      completionPercentage: true,
      template: { select: { name: true } },
      // The block is the source of truth: it holds the template the user
      // actually selected, whether or not the instance kept up.
      scheduleBlock: {
        select: { templateId: true, template: { select: { name: true, habits: { select: { id: true } } } } }
      },
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
    fromName: string;
    toName: string;
    retemplate: boolean;
    templateId: string;
    removeIds: string[];
    titles: string[];
    markedCount: number;
    nextPercentage: number;
  }> = [];

  for (const instance of instances) {
    const block = instance.scheduleBlock;
    if (!block) continue;

    const wanted = new Set(block.template.habits.map((habit) => habit.id));
    const stale = instance.habitCompletions.filter(
      (row) => row.templateHabitId !== null && !wanted.has(row.templateHabitId)
    );
    const retemplate = instance.templateId !== block.templateId;

    if (!stale.length && !retemplate) continue;

    const staleIds = new Set(stale.map((row) => row.id));
    const keptHabits = instance.habitCompletions.filter((row) => !staleIds.has(row.id));
    const remaining = [...keptHabits, ...instance.taskCompletions];
    const completed = remaining.filter((row) => row.completed).length;
    const nextPercentage = remaining.length ? Math.round((completed / remaining.length) * 100) : 0;

    repairs.push({
      id: instance.id,
      dateKey: instance.date.toISOString().slice(0, 10),
      fromName: instance.template.name,
      toName: block.template.name,
      retemplate,
      templateId: block.templateId,
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
  let retemplated = 0;
  for (const repair of repairs) {
    removed += repair.removeIds.length;
    marked += repair.markedCount;
    if (repair.retemplate) retemplated += 1;

    console.log(`${repair.dateKey}  ${repair.toName}`);
    if (repair.retemplate) {
      console.log(`  instance still recorded "${repair.fromName}" — repointing to "${repair.toName}"`);
    }
    if (repair.removeIds.length) {
      console.log(`  removing ${repair.removeIds.length}: ${repair.titles.join(", ")}`);
    }
    if (repair.markedCount) console.log(`  ${repair.markedCount} of these were already completed/marked`);
  }

  if (apply) {
    for (const repair of repairs) {
      await prisma.$transaction([
        ...(repair.removeIds.length
          ? [prisma.habitCompletion.deleteMany({ where: { id: { in: repair.removeIds } } })]
          : []),
        prisma.blockInstance.update({
          where: { id: repair.id },
          data: { templateId: repair.templateId, completionPercentage: repair.nextPercentage }
        })
      ]);
    }
  }

  console.log("\n────────────────────────────────────");
  console.log(`instances repaired:        ${repairs.length}`);
  console.log(`  of which repointed:      ${retemplated}`);
  console.log(`habit rows removed:        ${removed}`);
  console.log(`of those already marked:   ${marked}`);
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
