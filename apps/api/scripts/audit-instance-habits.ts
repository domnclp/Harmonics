/**
 * Reports BlockInstance rows whose habits do not match their template.
 *
 * Read-only. Instances materialize habits once, so before instanceSync existed
 * an instance kept the previous template's habits when its block was pointed at
 * a different template. Run this to see the damage before repairing it:
 *
 *   npx tsx scripts/audit-instance-habits.ts
 */
import { prisma } from "../src/prisma/client.js";

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const main = async () => {
  const cutoff = startOfToday();

  const instances = await prisma.blockInstance.findMany({
    where: { date: { gte: cutoff } },
    select: {
      id: true,
      date: true,
      templateId: true,
      template: { select: { name: true } },
      // Compare against the BLOCK's template, not the instance's. An instance
      // whose templateId drifted is stale on both sides, so checking it against
      // itself reports a false clean — which is exactly how the first pass of
      // this audit missed four broken days.
      scheduleBlock: {
        select: { templateId: true, template: { select: { name: true, habits: { select: { id: true, title: true } } } } }
      },
      habitCompletions: {
        select: { id: true, templateHabitId: true, title: true, completed: true, failureReason: true }
      }
    },
    orderBy: { date: "asc" }
  });

  let mismatched = 0;
  let staleTotal = 0;
  let missingTotal = 0;
  let markedAtRisk = 0;

  let drifted = 0;

  for (const instance of instances) {
    const block = instance.scheduleBlock;
    if (!block) continue;

    const wanted = new Set(block.template.habits.map((habit) => habit.id));
    const templateDrifted = instance.templateId !== block.templateId;
    if (templateDrifted) drifted += 1;
    const present = new Set(
      instance.habitCompletions.filter((row) => row.templateHabitId).map((row) => row.templateHabitId as string)
    );

    // Rows pointing at a habit the current template does not own — the
    // signature of a template swap.
    const stale = instance.habitCompletions.filter(
      (row) => row.templateHabitId !== null && !wanted.has(row.templateHabitId)
    );
    // Orphans: the template habit was deleted, so the FK was set to null.
    const orphaned = instance.habitCompletions.filter((row) => row.templateHabitId === null);
    const missing = block.template.habits.filter((habit) => !present.has(habit.id));

    if (!stale.length && !missing.length && !templateDrifted) continue;

    mismatched += 1;
    staleTotal += stale.length;
    missingTotal += missing.length;

    const touched = stale.filter((row) => row.completed || row.failureReason);
    markedAtRisk += touched.length;

    const dateKey = instance.date.toISOString().slice(0, 10);
    console.log(`\n${dateKey}  ${block.template.name}  (instance ${instance.id})`);
    if (templateDrifted) {
      console.log(`  instance still records "${instance.template.name}" — its block now uses "${block.template.name}"`);
    }
    if (stale.length) {
      console.log(`  does not belong (${stale.length}):`);
      for (const row of stale) {
        const state = row.completed ? " [completed]" : row.failureReason ? " [marked failed]" : "";
        console.log(`    - ${row.title}${state}`);
      }
    }
    if (missing.length) {
      console.log(`  missing from this block (${missing.length}):`);
      for (const habit of missing) console.log(`    + ${habit.title}`);
    }
    if (orphaned.length) {
      console.log(`  user-added one-offs, will be kept (${orphaned.length}): ${orphaned.map((row) => row.title).join(", ")}`);
    }
  }

  console.log("\n────────────────────────────────────");
  console.log(`instances scanned (today onward): ${instances.length}`);
  console.log(`instances needing repair:         ${mismatched}`);
  console.log(`instances with a drifted template: ${drifted}`);
  console.log(`habit rows to remove:             ${staleTotal}`);
  console.log(`habit rows to add:                ${missingTotal}`);
  console.log(`of those removed, already marked: ${markedAtRisk}`);
  console.log("\nRead-only — nothing was changed.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
