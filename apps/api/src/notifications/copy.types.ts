export type NotificationKind =
  | "HEADS_UP"
  | "BLOCK_START"
  | "BLOCK_END"
  | "STREAK_RISK"
  | "DAILY_AGENDA"
  | "DAY_WRAP_UP";

/**
 * Everything the copy layer is allowed to know. Deliberately a plain data bag
 * with no Date and no I/O, so variants can be exercised by calling the builder
 * with hand-written contexts — the closest thing to a test this repo supports.
 */
export type CopyContext = {
  kind: NotificationKind;
  /** Already extracted and validated from the nullable User.name. */
  firstName: string | null;
  /** User-local wall clock, "HH:mm". Time-of-day phrasing derives from this. */
  hhmm: string;
  dateKey: string;

  blockName?: string;
  startTime?: string;
  endTime?: string;
  minutesUntil?: number;

  /** Items with neither completed nor an explicit failureReason. */
  unmarkedCount?: number;
  totalCount?: number;

  blocksDone?: number;
  blocksTracked?: number;
  totalBlocksToday?: number;
  habitsToday?: number;
  tasksToday?: number;
  isFirstBlockOfDay?: boolean;

  /** 0..100 for the day so far. */
  completionRate?: number;
  yesterdayCompletionRate?: number;

  longestStreak?: number;
  streakHabitName?: string;

  /** Caller-supplied determinism — same notification always renders the same. */
  seed: number;
};

export type NotificationCopy = {
  title: string;
  body: string;
};
