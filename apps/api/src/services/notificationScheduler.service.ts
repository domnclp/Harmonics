import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { blockOccursOnDate, parseActiveDays } from "../lib/recurrence.js";
import { isWithinWindow, nowInZone, shiftMinutesWithinDay, toMinutes, type ZonedNow } from "../lib/dateTime.js";
import { buildNotification, seedFromKey, toFirstName } from "../notifications/copy.js";
import type { CopyContext, NotificationKind } from "../notifications/copy.types.js";
import { pushService, isPushConfigured } from "./push.service.js";
import { blockInstanceService } from "./blockInstance.service.js";
import { getUserHabitStreaks } from "./habitStreak.service.js";

// Mirrors the @default values on UserSettings in prisma/schema.prisma. The
// settings row is optional (User.settings is nullable), so the scheduler must
// run without one. Keep in sync with the schema.
const defaultSettings = {
  scheduleStart: "06:00",
  scheduleEnd: "23:00",
  activeDays: "0,1,2,3,4,5,6",
  timezone: "UTC"
};

/**
 * A trigger fires when local time is in [target, target + CATCHUP_MINUTES).
 *
 * Exact-minute equality would silently drop a notification whenever a tick runs
 * late or the process restarts across the boundary. A wider window would deliver
 * stale bursts after downtime. Three minutes is the balance; the dedupe log
 * collapses the repeats.
 */
const catchupMinutes = 3;

export type ResolvedSettings = {
  scheduleStart: string;
  scheduleEnd: string;
  activeDays: number[];
  timezone: string;
};

export const resolveSettings = (settings: {
  scheduleStart?: string;
  scheduleEnd?: string;
  activeDays?: string;
  timezone?: string;
} | null): ResolvedSettings => ({
  scheduleStart: settings?.scheduleStart ?? defaultSettings.scheduleStart,
  scheduleEnd: settings?.scheduleEnd ?? defaultSettings.scheduleEnd,
  activeDays: parseActiveDays(settings?.activeDays ?? defaultSettings.activeDays),
  timezone: settings?.timezone ?? defaultSettings.timezone
});

const blockInclude = {
  template: {
    select: {
      id: true,
      name: true,
      habits: { select: { id: true, title: true } },
      tasks: { select: { id: true, title: true } }
    }
  }
};

export const loadBlocksForDate = async (userId: string, dateKey: string, activeDays: number[]) => {
  const blocks = await prisma.scheduleBlock.findMany({ where: { userId }, include: blockInclude });

  // Lexicographic sort is valid because startTime is a zero-padded "HH:mm".
  return blocks
    .filter((block) => blockOccursOnDate(block, dateKey, activeDays))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

type ScheduledBlock = Awaited<ReturnType<typeof loadBlocksForDate>>[number];

const isDue = (target: number | null, minutes: number) =>
  target !== null && minutes >= target && minutes < target + catchupMinutes;

const buildDedupeKey = (userId: string, kind: NotificationKind, dateKey: string, blockId?: string) =>
  [userId, kind, dateKey, blockId ?? "-"].join(":");

/**
 * Claim a dedupe key before sending.
 *
 * Claim-first can lose a notification if the process dies between claim and
 * send. Send-first would re-send on the next tick after a crash — and with a
 * one-minute cron that becomes a lock-screen storm. Losing one notification is
 * a minor annoyance; spamming someone's phone is what gets the feature disabled.
 */
const claim = async (userId: string, kind: NotificationKind, dedupeKey: string) => {
  try {
    await prisma.notificationLog.create({ data: { userId, kind, dedupeKey } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
};

export type TickResult = {
  usersProcessed: number;
  notificationsSent: number;
  errors: number;
};

type UserForTick = {
  id: string;
  name: string | null;
  settings: ResolvedSettings;
  prefs: {
    headsUpEnabled: boolean;
    headsUpMinutes: number;
    blockStartEnabled: boolean;
    blockEndEnabled: boolean;
    streakRiskEnabled: boolean;
    streakRiskTime: string;
    dailyAgendaEnabled: boolean;
    dayWrapUpEnabled: boolean;
    dayWrapUpTime: string;
  };
};

// Mirrors the @default values on NotificationPreference in schema.prisma.
const defaultPrefs: UserForTick["prefs"] = {
  headsUpEnabled: true,
  headsUpMinutes: 30,
  blockStartEnabled: false,
  blockEndEnabled: true,
  streakRiskEnabled: false,
  streakRiskTime: "20:00",
  dailyAgendaEnabled: true,
  dayWrapUpEnabled: false,
  dayWrapUpTime: "21:30"
};

/** Unmarked = neither completed nor explicitly failed. completionPercentage
 * cannot be used here: 0 means both "untouched" and "marked failed". */
const countUnmarked = (items: { completed: boolean; failureReason: string | null }[]) =>
  items.filter((item) => !item.completed && !item.failureReason).length;

const dispatch = async (
  user: UserForTick,
  kind: NotificationKind,
  dedupeKey: string,
  context: Omit<CopyContext, "kind" | "seed" | "firstName">,
  url: string
) => {
  if (!(await claim(user.id, kind, dedupeKey))) return 0;

  const copy = buildNotification({
    ...context,
    kind,
    firstName: toFirstName(user.name),
    seed: seedFromKey(dedupeKey)
  });

  const result = await pushService.sendToUser(user.id, {
    title: copy.title,
    body: copy.body,
    tag: dedupeKey,
    url
  });

  return result.sent;
};

const blockUrl = (blockId: string, dateKey: string) =>
  `/dashboard?block=${encodeURIComponent(blockId)}&date=${encodeURIComponent(dateKey)}`;

const processUser = async (user: UserForTick, zoned: ZonedNow): Promise<number> => {
  const { minutes, dateKey } = zoned;
  const { prefs, settings } = user;

  // Quiet hours: reuse the schedule window rather than a separate setting.
  if (!isWithinWindow(minutes, settings.scheduleStart, settings.scheduleEnd)) return 0;

  const blocks = await loadBlocksForDate(user.id, dateKey, settings.activeDays);
  if (!blocks.length) return 0;

  const trackable = blocks.filter(
    (block) => block.template.habits.length + block.template.tasks.length > 0
  );
  const firstBlockId = blocks[0]?.id;
  let sent = 0;

  const agendaContext = (block: ScheduledBlock) => ({
    hhmm: zoned.hhmm,
    dateKey,
    blockName: block.template.name,
    startTime: block.startTime,
    endTime: block.endTime,
    totalBlocksToday: blocks.length,
    habitsToday: blocks.reduce((sum, item) => sum + item.template.habits.length, 0),
    tasksToday: blocks.reduce((sum, item) => sum + item.template.tasks.length, 0)
  });

  // 1. Daily agenda — at the start of the schedule window.
  if (prefs.dailyAgendaEnabled && isDue(toMinutes(settings.scheduleStart), minutes)) {
    const first = blocks[0]!;
    sent += await dispatch(
      user,
      "DAILY_AGENDA",
      buildDedupeKey(user.id, "DAILY_AGENDA", dateKey),
      agendaContext(first),
      "/dashboard"
    );
  }

  // 2. Per-block triggers.
  for (const block of blocks) {
    const totalCount = block.template.habits.length + block.template.tasks.length;

    if (prefs.headsUpEnabled) {
      const target = shiftMinutesWithinDay(block.startTime, -prefs.headsUpMinutes);
      if (isDue(target, minutes)) {
        sent += await dispatch(
          user,
          "HEADS_UP",
          buildDedupeKey(user.id, "HEADS_UP", dateKey, block.id),
          {
            hhmm: zoned.hhmm,
            dateKey,
            blockName: block.template.name,
            startTime: block.startTime,
            endTime: block.endTime,
            minutesUntil: prefs.headsUpMinutes,
            totalCount,
            habitsToday: block.template.habits.length,
            tasksToday: block.template.tasks.length,
            isFirstBlockOfDay: block.id === firstBlockId
          },
          blockUrl(block.id, dateKey)
        );
      }
    }

    if (prefs.blockStartEnabled && isDue(toMinutes(block.startTime), minutes)) {
      sent += await dispatch(
        user,
        "BLOCK_START",
        buildDedupeKey(user.id, "BLOCK_START", dateKey, block.id),
        {
          hhmm: zoned.hhmm,
          dateKey,
          blockName: block.template.name,
          startTime: block.startTime,
          endTime: block.endTime,
          totalCount,
          habitsToday: block.template.habits.length,
          tasksToday: block.template.tasks.length,
          isFirstBlockOfDay: block.id === firstBlockId
        },
        blockUrl(block.id, dateKey)
      );
    }

    // Only blocks with something to mark can be "unmarked".
    if (prefs.blockEndEnabled && totalCount > 0 && isDue(toMinutes(block.endTime), minutes)) {
      // findOrCreate materializes the instance so the notification can report
      // real counts. Gated on the preference so the write stays opt-in.
      const instance = await blockInstanceService.findOrCreate(user.id, block.id, dateKey);
      const unmarkedCount =
        countUnmarked(instance.habitCompletions) + countUnmarked(instance.taskCompletions);

      if (unmarkedCount > 0) {
        sent += await dispatch(
          user,
          "BLOCK_END",
          buildDedupeKey(user.id, "BLOCK_END", dateKey, block.id),
          {
            hhmm: zoned.hhmm,
            dateKey,
            blockName: block.template.name,
            startTime: block.startTime,
            endTime: block.endTime,
            unmarkedCount,
            totalCount: instance.habitCompletions.length + instance.taskCompletions.length,
            completionRate: instance.completionPercentage
          },
          blockUrl(block.id, dateKey)
        );
      }
    }
  }

  // 3. Streak at risk — one query for every streak, then pick the longest that
  // is still unmarked today.
  if (prefs.streakRiskEnabled && isDue(toMinutes(prefs.streakRiskTime), minutes)) {
    const streaks = await getUserHabitStreaks(user.id, dateKey);

    if (streaks.size) {
      const todayInstances = await prisma.blockInstance.findMany({
        where: { userId: user.id, date: new Date(`${dateKey}T00:00:00.000Z`) },
        select: { templateId: true, habitCompletions: { select: { templateHabitId: true, title: true, completed: true } } }
      });

      const completedToday = new Set<string>();
      for (const instance of todayInstances) {
        for (const habit of instance.habitCompletions) {
          if (habit.completed) {
            completedToday.add(habit.templateHabitId ?? `${instance.templateId}:${habit.title}`);
          }
        }
      }

      const atRisk = [...streaks.values()]
        .filter((streak) => !completedToday.has(streak.key))
        .sort((a, b) => b.streak - a.streak)[0];

      if (atRisk) {
        sent += await dispatch(
          user,
          "STREAK_RISK",
          buildDedupeKey(user.id, "STREAK_RISK", dateKey),
          {
            hhmm: zoned.hhmm,
            dateKey,
            longestStreak: atRisk.streak,
            streakHabitName: atRisk.title
          },
          "/dashboard"
        );
      }
    }
  }

  // 4. End-of-day wrap-up.
  if (prefs.dayWrapUpEnabled && isDue(toMinutes(prefs.dayWrapUpTime), minutes) && trackable.length) {
    const instances = await prisma.blockInstance.findMany({
      where: {
        userId: user.id,
        date: new Date(`${dateKey}T00:00:00.000Z`),
        scheduleBlockId: { in: trackable.map((block) => block.id) }
      },
      select: { completionPercentage: true }
    });

    const blocksDone = instances.filter((instance) => instance.completionPercentage === 100).length;
    const completionRate = trackable.length
      ? Math.round(instances.reduce((sum, item) => sum + item.completionPercentage, 0) / trackable.length)
      : 0;

    sent += await dispatch(
      user,
      "DAY_WRAP_UP",
      buildDedupeKey(user.id, "DAY_WRAP_UP", dateKey),
      {
        hhmm: zoned.hhmm,
        dateKey,
        blocksDone,
        blocksTracked: trackable.length,
        completionRate
      },
      "/dashboard"
    );
  }

  return sent;
};

const pruneOldLogs = async () => {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  await prisma.notificationLog.deleteMany({ where: { sentAt: { lt: cutoff } } });
};

export const notificationScheduler = {
  /**
   * `now` is injectable so time-dependent behaviour can be exercised without
   * waiting for the wall clock — the only practical verification lever in a repo
   * with no test suite.
   */
  async tick(now: Date = new Date()): Promise<TickResult> {
    const result: TickResult = { usersProcessed: 0, notificationsSent: 0, errors: 0 };
    if (!isPushConfigured()) return result;

    // Only users with at least one subscription can receive anything.
    const users = await prisma.user.findMany({
      where: { pushSubscriptions: { some: {} } },
      select: { id: true, name: true, settings: true, notificationPreference: true }
    });

    for (const user of users) {
      result.usersProcessed += 1;

      try {
        const settings = resolveSettings(user.settings);
        const zoned = nowInZone(now, settings.timezone);

        result.notificationsSent += await processUser(
          {
            id: user.id,
            name: user.name,
            settings,
            prefs: user.notificationPreference ?? defaultPrefs
          },
          zoned
        );
      } catch (error) {
        // One user's bad data must never abort the tick for everyone else.
        result.errors += 1;
        console.error("[notifications] user tick failed", { userId: user.id, error });
      }
    }

    // Cheap daily prune. The dedupe key includes dateKey, so removing old rows
    // can never resurrect a current-day notification.
    if (now.getUTCHours() === 3 && now.getUTCMinutes() < catchupMinutes) {
      await pruneOldLogs().catch((error) => console.error("[notifications] prune failed", error));
    }

    return result;
  }
};

/** What the scheduler believes about a user right now — used by the debug route. */
export const describeToday = async (userId: string, now: Date = new Date()) => {
  const settings = resolveSettings(await prisma.userSettings.findUnique({ where: { userId } }));
  const zoned = nowInZone(now, settings.timezone);
  const blocks = await loadBlocksForDate(userId, zoned.dateKey, settings.activeDays);

  return {
    now: now.toISOString(),
    settings,
    local: zoned,
    blocks: blocks.map((block) => ({
      id: block.id,
      template: block.template.name,
      startTime: block.startTime,
      endTime: block.endTime,
      dayOfWeek: block.dayOfWeek,
      recurrenceRule: block.recurrenceRule,
      anchorDate: block.date ? block.date.toISOString().slice(0, 10) : null,
      habits: block.template.habits.length,
      tasks: block.template.tasks.length
    }))
  };
};
