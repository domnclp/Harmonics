import type { CopyContext, NotificationCopy, NotificationKind } from "./copy.types.js";

// TONE RULES — these are the difference between a notification that survives and
// one that gets muted in a week:
//   * Never "you failed", "you missed", "don't break your streak".
//   * Frame streaks as opportunity, not loss.
//   * Rough days stay factual and forward-looking, never disappointed.
//   * No exclamation stacking, no emoji.
//   * Prefer invitations: "How did that go?", "whenever you get a sec".

type Variant = {
  when: (context: CopyContext) => boolean;
  title: (context: CopyContext) => string;
  body: (context: CopyContext) => string;
  /**
   * Higher wins. Without this, `seed % matches.length` lets the always-true
   * fallback outvote a specific variant — which is how a 20% day ended up
   * saying "Solid day". Randomness applies only within a priority tier.
   */
  priority?: number;
};

/** Lowercase 12-hour time, matching how the dashboard renders times. */
export const formatClock = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** "an 8-day run" vs "a 12-day run" — 8, 11 and 18 take "an". */
const article = (count: number) => {
  const text = String(count);
  return text === "8" || text.startsWith("8") || text === "11" || text === "18" ? "an" : "a";
};

/**
 * User.name comes from user-controlled Supabase metadata and could be an email,
 * an emoji, or 200 characters. Never interpolate it unvalidated.
 */
export const toFirstName = (name: string | null | undefined): string | null => {
  const first = name?.trim().split(/\s+/)[0];
  return first && /^[\p{L}'-]{1,20}$/u.test(first) ? first : null;
};

/** Used roughly one notification in three so it stays warm, not gimmicky. */
const greet = (context: CopyContext) =>
  context.firstName && context.seed % 3 === 0 ? `${context.firstName}, ` : "";

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const itemSummary = (context: CopyContext) => {
  const habits = context.habitsToday ?? 0;
  const tasks = context.tasksToday ?? 0;
  const parts: string[] = [];
  if (habits) parts.push(plural(habits, "habit"));
  if (tasks) parts.push(plural(tasks, "task"));
  return parts.join(", ");
};

// Every array ends with a `when: () => true` fallback, which makes "no variant
// matched" structurally impossible.
const variants: Record<NotificationKind, Variant[]> = {
  HEADS_UP: [
    {
      when: (c) => (c.longestStreak ?? 0) >= 3,
      priority: 3,
      title: (c) => `${c.blockName} in ${c.minutesUntil} min`,
      body: (c) =>
        `${formatClock(c.startTime ?? "")} · day ${c.longestStreak} of your ${c.streakHabitName ?? "habit"} run.`
    },
    {
      when: (c) => Boolean(c.isFirstBlockOfDay),
      priority: 2,
      title: (c) => `${capitalize(greet(c))}the day starts in ${c.minutesUntil} min`,
      body: (c) => `${c.blockName} at ${formatClock(c.startTime ?? "")}${itemSummary(c) ? ` · ${itemSummary(c)}` : ""}.`
    },
    {
      when: (c) => (c.totalCount ?? 0) > 0,
      priority: 1,
      title: (c) => `${c.blockName} in ${c.minutesUntil} min`,
      body: (c) => `${formatClock(c.startTime ?? "")} · ${itemSummary(c)} waiting. No rush, just a heads-up.`
    },
    {
      when: () => true,
      title: (c) => `${c.blockName} in ${c.minutesUntil} min`,
      body: (c) => `Starts at ${formatClock(c.startTime ?? "")}.`
    }
  ],

  BLOCK_START: [
    {
      when: (c) => Boolean(c.isFirstBlockOfDay),
      priority: 2,
      title: (c) => `${c.blockName} is up`,
      body: (c) => `${formatClock(c.startTime ?? "")} – ${formatClock(c.endTime ?? "")}. First one of the day.`
    },
    {
      when: (c) => (c.totalCount ?? 0) > 0,
      priority: 1,
      title: (c) => `${c.blockName} is up`,
      body: (c) => `${formatClock(c.startTime ?? "")} – ${formatClock(c.endTime ?? "")} · ${itemSummary(c)}. One at a time.`
    },
    {
      when: () => true,
      title: (c) => `${c.blockName} is up`,
      body: (c) => `${formatClock(c.startTime ?? "")} – ${formatClock(c.endTime ?? "")}.`
    }
  ],

  BLOCK_END: [
    {
      when: (c) => (c.unmarkedCount ?? 0) === (c.totalCount ?? 0) && (c.totalCount ?? 0) > 0,
      priority: 3,
      title: () => "How did that go?",
      body: (c) => `${c.blockName} just wrapped. Mark what happened whenever you get a moment.`
    },
    {
      when: (c) => (c.unmarkedCount ?? 0) === 1,
      priority: 3,
      title: (c) => `${c.blockName} wrapped up`,
      body: (c) => `Just one thing left open. No rush${c.firstName ? `, ${c.firstName}` : ""}.`
    },
    {
      when: (c) => (c.completionRate ?? 0) >= 70,
      priority: 2,
      title: (c) => `${c.blockName} wrapped up`,
      body: (c) => `${plural(c.unmarkedCount ?? 0, "item")} still open — strong block otherwise.`
    },
    {
      when: () => true,
      title: (c) => `${c.blockName} wrapped up`,
      body: (c) => `${plural(c.unmarkedCount ?? 0, "item")} still open whenever you get a moment.`
    }
  ],

  STREAK_RISK: [
    {
      // Day 6 and 29 are one short of a round milestone — worth calling out.
      when: (c) => [6, 13, 29].includes(c.longestStreak ?? 0),
      priority: 3,
      title: (c) =>
        `One more and ${c.streakHabitName} hits ${(c.longestStreak ?? 0) === 6 ? "a full week" : (c.longestStreak ?? 0) === 13 ? "two weeks" : "a month"}`,
      body: () => "Still time before the day closes."
    },
    {
      when: (c) => (c.longestStreak ?? 0) >= 7,
      priority: 2,
      title: (c) => `Your ${c.streakHabitName} streak is at ${c.longestStreak} days`,
      body: (c) => `${greet(c)}still open tonight — worth keeping going.`
    },
    {
      when: (c) => (c.longestStreak ?? 0) >= 7,
      priority: 2,
      title: (c) => `${c.streakHabitName} is on ${article(c.longestStreak ?? 0)} ${c.longestStreak}-day run`,
      body: () => "Still open tonight. Worth keeping going."
    },
    {
      when: () => true,
      title: (c) => `${c.streakHabitName} is on ${article(c.longestStreak ?? 0)} ${c.longestStreak}-day run`,
      body: () => "There's still time today."
    }
  ],

  DAILY_AGENDA: [
    {
      when: (c) => (c.yesterdayCompletionRate ?? -1) >= 100,
      priority: 3,
      title: (c) => `${plural(c.totalBlocksToday ?? 0, "block")} today`,
      body: (c) =>
        `Yesterday came in at 100%. First up: ${c.blockName} at ${formatClock(c.startTime ?? "")}.`
    },
    {
      when: (c) => (c.totalBlocksToday ?? 0) >= 7,
      priority: 2,
      title: (c) => `Full day ahead — ${plural(c.totalBlocksToday ?? 0, "block")}`,
      body: (c) => `${capitalize(`${greet(c)}first up`)}: ${c.blockName} at ${formatClock(c.startTime ?? "")}.`
    },
    {
      when: (c) => (c.totalBlocksToday ?? 0) <= 3,
      priority: 2,
      title: (c) => `An easy one today — ${plural(c.totalBlocksToday ?? 0, "block")}`,
      body: (c) => `${c.blockName} kicks off at ${formatClock(c.startTime ?? "")}.`
    },
    {
      when: () => true,
      title: (c) => `${capitalize(greet(c))}${plural(c.totalBlocksToday ?? 0, "block")} today`,
      body: (c) =>
        `First up: ${c.blockName} at ${formatClock(c.startTime ?? "")}${itemSummary(c) ? ` · ${itemSummary(c)} across the day` : ""}.`
    }
  ],

  DAY_WRAP_UP: [
    {
      when: (c) => (c.completionRate ?? 0) >= 100,
      priority: 3,
      title: () => "Clean sweep",
      body: (c) => `All ${c.blocksTracked} blocks done. That's the whole day${c.firstName ? `, ${c.firstName}` : ""}.`
    },
    {
      // Must outrank the generic "solid day" fallback — congratulating someone
      // on a 20% day is the fastest way to get notifications muted.
      when: (c) => (c.completionRate ?? 0) <= 25,
      priority: 3,
      title: (c) => `${c.blocksDone} of ${c.blocksTracked} today`,
      body: () => "Some days are like that. Tomorrow's already set up."
    },
    {
      when: (c) =>
        (c.yesterdayCompletionRate ?? -1) >= 0 && (c.completionRate ?? 0) > (c.yesterdayCompletionRate ?? 0),
      priority: 2,
      title: (c) => `${c.completionRate}% today`,
      body: (c) => `Up from ${c.yesterdayCompletionRate}% yesterday. Trending the right way.`
    },
    {
      when: () => true,
      title: (c) => `${c.blocksDone} of ${c.blocksTracked} blocks done — ${c.completionRate}% today`,
      body: (c) => `Solid day${c.firstName ? `, ${c.firstName}` : ""}.`
    }
  ]
};

/** Small deterministic hash so a dedupe key always yields the same variant. */
export const seedFromKey = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const buildNotification = (context: CopyContext): NotificationCopy => {
  const matches = variants[context.kind].filter((variant) => variant.when(context));
  const topPriority = Math.max(...matches.map((variant) => variant.priority ?? 0));
  const candidates = matches.filter((variant) => (variant.priority ?? 0) === topPriority);
  const variant = candidates[context.seed % candidates.length]!;

  return {
    title: variant.title(context),
    body: variant.body(context)
  };
};
