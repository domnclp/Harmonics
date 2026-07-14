import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LoadError } from "../components/ui/load-error";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { Progress } from "../components/ui/progress";
import { apiFetch } from "../lib/api";
import { getSubtleColorFill, withAlpha } from "../lib/color";
import {
  addDays,
  dayOfWeekMondayFirst,
  formatTime,
  getDurationMinutes,
  getLogicalEndMinutes,
  getLogicalMinutes,
  getScheduleDate,
  getTimeSlots,
  toDateKey,
  toMinutes
} from "../lib/date";
import { blockOccursOnDate } from "../lib/recurrence";
import { getColumnStyle, getPositionedBlocks } from "../lib/scheduleLayout";
import { cn } from "../lib/utils";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import { useScheduleWindow } from "../hooks/useScheduleWindow";
import { useActiveDays } from "../hooks/useActiveDays";
import type { BlockInstance, Completion, ScheduleBlock } from "../types";
import { useEffect, useMemo, useRef, useState } from "react";

type SelectedBlock = { block: ScheduleBlock; date: string };

const rowHeight = 52;
const blockInset = 6;
const getTemplateHabits = (block: ScheduleBlock) => block.template.habits ?? [];
const getChecklistTotal = (block: ScheduleBlock, instance?: BlockInstance) =>
  getTemplateHabits(block).length + (instance?.taskCompletions.length ?? 0);

const getSavedCompletion = (instance?: BlockInstance) => {
  if (!instance) return 0;

  const items = [...instance.habitCompletions, ...instance.taskCompletions];
  if (!items.length) return instance.completionPercentage;

  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
};

const stepToActiveDay = (date: Date, direction: 1 | -1, activeDays: number[]) => {
  if (!activeDays.length || activeDays.length === 7) return addDays(date, direction);

  let next = addDays(date, direction);
  for (let i = 0; i < 7; i += 1) {
    if (activeDays.includes(dayOfWeekMondayFirst(next))) return next;
    next = addDays(next, direction);
  }

  return next;
};

const getDateLabel = (date: Date, todayDate = new Date()) => {
  const today = toDateKey(todayDate);
  const key = toDateKey(date);
  if (key === today) return "today";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date).toLowerCase();
};

const getFullDateLabel = (date: Date) => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date);
const isSameDate = (left: Date, right: Date) => toDateKey(left) === toDateKey(right);
const getBlockDuration = (block: ScheduleBlock) => {
  const minutes = getDurationMinutes(block.startTime, block.endTime);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${minutes} min`;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
};

const isActiveScheduleDate = (activeDate: Date, now: Date, timelineStart: number, timelineEnd: number) => {
  if (isSameDate(activeDate, now)) return true;
  if (timelineEnd <= 24 * 60) return false;

  const nextDate = addDays(activeDate, 1);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return isSameDate(nextDate, now) && nowMinutes <= timelineEnd - 24 * 60;
};

const getNowLogicalMinutes = (activeDate: Date, now: Date, timelineEnd: number) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return !isSameDate(activeDate, now) && timelineEnd > 24 * 60 ? nowMinutes + 24 * 60 : nowMinutes;
};

const getTimeUntilLabel = (block: ScheduleBlock, dayStart: number, nowLogicalMinutes: number, showsNow: boolean) => {
  if (!showsNow) return `Starts ${formatTime(block.startTime).toLowerCase()}`;

  const start = getLogicalMinutes(block.startTime, dayStart);
  const end = getLogicalEndMinutes(block.startTime, block.endTime, dayStart);
  const minutesUntil = start - nowLogicalMinutes;
  if (minutesUntil <= 0 && end >= nowLogicalMinutes) return "In progress";
  if (minutesUntil <= 0) return "Overdue";

  const hours = Math.floor(minutesUntil / 60);
  const minutes = minutesUntil % 60;
  if (!hours) return `Starts in ${minutes} min`;
  if (!minutes) return `Starts in ${hours} hr`;
  return `Starts in ${hours} hr ${minutes} min`;
};

const getBlockStyle = (block: ScheduleBlock, column: number, columns: number, timelineStart: number, timelineEnd: number) => {
  const start = Math.max(getLogicalMinutes(block.startTime, timelineStart), timelineStart);
  const end = Math.min(getLogicalEndMinutes(block.startTime, block.endTime, timelineStart), timelineEnd);
  if (end <= start) return null;

  const top = ((start - timelineStart) / 30) * rowHeight + blockInset;
  const height = Math.max(((end - start) / 30) * rowHeight - blockInset * 2, 40);

  return {
    top,
    height,
    ...getColumnStyle(column, columns),
    borderColor: withAlpha(block.template.color, 0.42),
    backgroundColor: getSubtleColorFill(block.template.color)
  };
};

export function DashboardPage() {
  const [activeDate, setActiveDate] = useState(new Date());
  const [now, setNow] = useState(() => new Date());
  const syncedInitialScheduleDate = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dateKey = toDateKey(activeDate);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const queryClient = useQueryClient();
  const scheduleWindow = useScheduleWindow();
  const activeDays = useActiveDays();
  const timelineStart = toMinutes(scheduleWindow.startTime);
  const timelineEnd = getLogicalEndMinutes(scheduleWindow.startTime, scheduleWindow.endTime, timelineStart);
  const scheduleToday = useMemo(
    () => getScheduleDate(now, scheduleWindow.startTime, scheduleWindow.endTime),
    [now, scheduleWindow.endTime, scheduleWindow.startTime]
  );
  const todayDateKey = useMemo(() => toDateKey(scheduleToday), [scheduleToday]);
  const timelineSlots = useMemo(
    () => getTimeSlots(scheduleWindow.startTime, scheduleWindow.endTime),
    [scheduleWindow.endTime, scheduleWindow.startTime]
  );
  const timelineHeight = timelineSlots.length * rowHeight;
  const { data: blocks = [], error: blocksError, isError: blocksIsError, deleteBlock } = useScheduleBlocks();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (syncedInitialScheduleDate.current) return;

    setActiveDate(scheduleToday);
    syncedInitialScheduleDate.current = true;
  }, [scheduleToday]);

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => blockOccursOnDate(block, dateKey, activeDays))
        .sort((a, b) => getLogicalMinutes(a.startTime, timelineStart) - getLogicalMinutes(b.startTime, timelineStart)),
    [blocks, dateKey, timelineStart, activeDays]
  );
  const todayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => blockOccursOnDate(block, todayDateKey, activeDays))
        .sort((a, b) => getLogicalMinutes(a.startTime, timelineStart) - getLogicalMinutes(b.startTime, timelineStart)),
    [blocks, todayDateKey, timelineStart, activeDays]
  );
  const positionedDayBlocks = useMemo(() => getPositionedBlocks(dayBlocks, timelineStart), [dayBlocks, timelineStart]);

  const instances = useQuery({
    queryKey: ["dashboard-instances", dateKey],
    queryFn: () => apiFetch<BlockInstance[]>(`/api/block-instances?date=${dateKey}`)
  });

  const todayInstances = useQuery({
    queryKey: ["dashboard-instances", todayDateKey],
    queryFn: () => apiFetch<BlockInstance[]>(`/api/block-instances?date=${todayDateKey}`)
  });

  const showsNow = isActiveScheduleDate(activeDate, now, timelineStart, timelineEnd);
  const nowMinutes = getNowLogicalMinutes(activeDate, now, timelineEnd);

  const instancesByBlockId = useMemo(() => {
    const entries = (instances.data ?? []).map((instance) => [instance.scheduleBlockId, instance] as const);
    return new Map(entries);
  }, [instances.data]);

  const todayInstancesByBlockId = useMemo(() => {
    const entries = (todayInstances.data ?? []).map((instance) => [instance.scheduleBlockId, instance] as const);
    return new Map(entries);
  }, [todayInstances.data]);

  const dashboardBlocks = useMemo(
    () =>
      dayBlocks.map((block) => {
        const instance = instancesByBlockId.get(block.id);
        const completionPercentage = getSavedCompletion(instance);
        const checklistTotal = getChecklistTotal(block, instance);
        const isComplete = checklistTotal > 0 && completionPercentage === 100;

        return {
          block,
          instance,
          completionPercentage,
          checklistTotal,
          isComplete,
          startMinutes: getLogicalMinutes(block.startTime, timelineStart),
          endMinutes: getLogicalEndMinutes(block.startTime, block.endTime, timelineStart)
        };
      }),
    [dayBlocks, instancesByBlockId, timelineStart]
  );

  const todayDashboardBlocks = useMemo(
    () =>
      todayBlocks.map((block) => {
        const instance = todayInstancesByBlockId.get(block.id);
        const completionPercentage = getSavedCompletion(instance);
        const checklistTotal = getChecklistTotal(block, instance);
        const isComplete = checklistTotal > 0 && completionPercentage === 100;

        return {
          block,
          instance,
          completionPercentage,
          checklistTotal,
          isComplete
        };
      }),
    [todayBlocks, todayInstancesByBlockId]
  );

  // Only blocks with at least one habit or task count toward progress
  const trackableBlocks = useMemo(() => dashboardBlocks.filter((item) => item.checklistTotal > 0), [dashboardBlocks]);
  const todayTrackableBlocks = useMemo(() => todayDashboardBlocks.filter((item) => item.checklistTotal > 0), [todayDashboardBlocks]);

  const { completion, completedHabits, totalHabits, completedTasks, totalTasks } = useMemo(() => {
    const habitsByBlock = new Map((instances.data ?? []).map((instance) => [instance.scheduleBlockId, instance.habitCompletions] as const));

    const totalBlockProgress = trackableBlocks.reduce((sum, item) => sum + item.completionPercentage, 0);
    const habits = dayBlocks.flatMap((block) => habitsByBlock.get(block.id) ?? getTemplateHabits(block).map(() => ({ completed: false })));
    const tasks = (instances.data ?? []).flatMap((instance) => instance.taskCompletions);

    return {
      completion: trackableBlocks.length ? Math.round(totalBlockProgress / trackableBlocks.length) : 0,
      completedHabits: habits.filter((item) => item.completed).length,
      totalHabits: habits.length,
      completedTasks: tasks.filter((item) => item.completed).length,
      totalTasks: tasks.length
    };
  }, [trackableBlocks, dayBlocks, instances.data]);

  const { todayCompletedHabits, todayTotalHabits, todayCompletedTasks, todayTotalTasks } = useMemo(() => {
    const habitsByBlock = new Map((todayInstances.data ?? []).map((instance) => [instance.scheduleBlockId, instance.habitCompletions] as const));
    const totalBlockProgress = todayTrackableBlocks.reduce((sum, item) => sum + item.completionPercentage, 0);
    const habits = todayBlocks.flatMap((block) => habitsByBlock.get(block.id) ?? getTemplateHabits(block).map(() => ({ completed: false })));
    const tasks = (todayInstances.data ?? []).flatMap((instance) => instance.taskCompletions);

    return {
      todayCompletedHabits: habits.filter((item) => item.completed).length,
      todayTotalHabits: habits.length,
      todayCompletedTasks: tasks.filter((item) => item.completed).length,
      todayTotalTasks: tasks.length
    };
  }, [todayTrackableBlocks, todayBlocks, todayInstances.data]);

  // Flat list of all tasks across today's blocks, with block reference for navigation
  const remainingTasks = useMemo(() => {
    const instanceList = instances.data ?? [];
    return instanceList.flatMap((instance) =>
      instance.taskCompletions.map((task) => ({
        task,
        instance,
        block: instance.scheduleBlock
      }))
    );
  }, [instances.data]);

  const updateInstancesCache = (id: string, completed: boolean, updated: Completion & { instanceCompletionPercentage?: number }, queryKey: readonly ["dashboard-instances", string]) => {
    queryClient.setQueryData<BlockInstance[]>(queryKey, (current) =>
      current?.map((inst) => {
        const hasTask = inst.taskCompletions.some((t) => t.id === id);
        if (!hasTask) return inst;
        const taskCompletions = inst.taskCompletions.map((t) =>
          t.id === id ? { ...t, completed } : t
        );
        const allItems = [...inst.habitCompletions, ...taskCompletions];
        const pct = updated.instanceCompletionPercentage ??
          (allItems.length ? Math.round(allItems.filter((x) => x.completed).length / allItems.length * 100) : 0);
        return { ...inst, taskCompletions, completionPercentage: pct };
      })
    );
  };

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiFetch<Completion & { instanceCompletionPercentage?: number }>(`/api/task-completions/${id}`, {
        method: "PATCH",
        body: { completed }
      }),
    onMutate: async ({ id, completed }) => {
      const todayKey = ["dashboard-instances", todayDateKey] as const;
      const dashKey = ["dashboard-instances", dateKey] as const;
      await queryClient.cancelQueries({ queryKey: dashKey });
      const previous = queryClient.getQueryData<BlockInstance[]>(dashKey);
      queryClient.setQueryData<BlockInstance[]>(dashKey, (current) =>
        current?.map((inst) => ({
          ...inst,
          taskCompletions: inst.taskCompletions.map((t) => (t.id === id ? { ...t, completed } : t))
        }))
      );
      if (todayKey[1] !== dateKey) {
        await queryClient.cancelQueries({ queryKey: todayKey });
      }
      return { previous, dashKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.dashKey, ctx.previous);
    },
    onSuccess: (updated, { id }) => {
      const dashKey = ["dashboard-instances", dateKey] as const;
      updateInstancesCache(id, updated.completed, updated, dashKey);
      const todayKey = ["dashboard-instances", todayDateKey] as const;
      if (todayKey[1] !== dateKey) {
        queryClient.invalidateQueries({ queryKey: todayKey });
      } else {
        updateInstancesCache(id, updated.completed, updated, todayKey);
      }
    }
  });

  const completedBlocks = trackableBlocks.filter((item) => item.isComplete).length;
  const todayCompletedBlocks = todayTrackableBlocks.filter((item) => item.isComplete).length;
  const remainingBlocks = dashboardBlocks.filter((item) => !item.isComplete);
  const overdueBlocks = showsNow ? remainingBlocks.filter((item) => item.endMinutes < nowMinutes) : [];
  const currentBlock = showsNow
    ? remainingBlocks.find((item) => item.startMinutes <= nowMinutes && item.endMinutes >= nowMinutes)
    : undefined;
  const upcomingBlock = showsNow ? remainingBlocks.find((item) => item.startMinutes > nowMinutes) : remainingBlocks[0];
  const primaryBlock = currentBlock ?? upcomingBlock ?? remainingBlocks[0];
  const attentionBlocks = [
    ...overdueBlocks,
    ...(primaryBlock && !overdueBlocks.some((item) => item.block.id === primaryBlock.block.id) ? [primaryBlock] : [])
  ];
  const todayOverallCompletion = useMemo(
    () => todayTrackableBlocks.length ? Math.round(todayTrackableBlocks.reduce((sum, item) => sum + item.completionPercentage, 0) / todayTrackableBlocks.length) : 0,
    [todayTrackableBlocks]
  );
  const progressBars = [
    {
      label: "Blocks",
      done: todayCompletedBlocks,
      total: todayTrackableBlocks.length,
      value: todayTrackableBlocks.length ? Math.round((todayCompletedBlocks / todayTrackableBlocks.length) * 100) : 0
    },
    {
      label: "Habits",
      done: todayCompletedHabits,
      total: todayTotalHabits,
      value: todayTotalHabits ? Math.round((todayCompletedHabits / todayTotalHabits) * 100) : 0
    },
    {
      label: "Tasks",
      done: todayCompletedTasks,
      total: todayTotalTasks,
      value: todayTotalTasks ? Math.round((todayCompletedTasks / todayTotalTasks) * 100) : 0
    }
  ];
  const nowTop = ((Math.min(Math.max(nowMinutes, timelineStart), timelineEnd) - timelineStart) / 30) * rowHeight;
  const firstBlock = dayBlocks[0];
  const lastBlock = dayBlocks[dayBlocks.length - 1];

  return (
    <div className="space-y-6">
      {blocksIsError && <LoadError label="schedule blocks" error={blocksError} />}
      {instances.isError && <LoadError label="dashboard instances" error={instances.error} />}
      {todayInstances.isError && <LoadError label="today's instances" error={todayInstances.error} />}

      <div className="flex flex-col justify-between gap-4 text-left lg:flex-row lg:items-end">
        <div className="w-full max-w-2xl self-start text-left">
          <h2 className="mt-1 text-3xl font-semibold">Daily overview</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getFullDateLabel(activeDate)} · Review the day&apos;s rhythm, progress, and next block.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add block
          </button>
          <Link
            to="/schedule"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted"
          >
            <CalendarDays className="h-4 w-4" />
            Weekly schedule
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(380px,44%)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-lg border bg-card shadow-soft xl:sticky xl:top-20 xl:self-start" aria-label="Single day calendar">
          <div className="border-b bg-card p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day planner</p>
                  <h3 className="mt-1 text-xl font-semibold">{getFullDateLabel(activeDate)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dayBlocks.length ? `${dayBlocks.length} blocks from ${formatTime(firstBlock.startTime).toLowerCase()} to ${formatTime(lastBlock.endTime).toLowerCase()}` : "No scheduled blocks"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border bg-background p-1 shadow-soft">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-sm transition hover:bg-muted"
                      aria-label="Previous day"
                      onClick={() => setActiveDate((date) => stepToActiveDay(date, -1, activeDays))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="h-8 min-w-24 rounded-sm px-3 text-sm font-semibold transition hover:bg-muted"
                      onClick={() => setActiveDate(scheduleToday)}
                    >
                      {getDateLabel(activeDate, scheduleToday)}
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-sm transition hover:bg-muted"
                      aria-label="Next day"
                      onClick={() => setActiveDate((date) => stepToActiveDay(date, 1, activeDays))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">{completion}%</span>
                </div>
              </div>

            </div>
          </div>

          <div className="relative bg-background" style={{ height: timelineHeight }}>
            <div className="absolute left-0 top-0 w-full">
              {timelineSlots.map((time, index) => {
                const isHour = time.endsWith(":00");
                return (
                  <div
                    key={`${time}-${index}`}
                    className={cn("grid border-t", isHour ? "border-border bg-card/35" : "border-border/60")}
                    style={{ gridTemplateColumns: "78px 1fr", height: rowHeight }}
                  >
                    <div className={cn("pr-3 pt-2 text-right font-medium uppercase", isHour ? "text-[11px] text-foreground" : "text-[10px] text-muted-foreground")}>
                      {formatTime(time).toLowerCase()}
                    </div>
                    <div className="border-l border-border/70" />
                  </div>
                );
              })}
            </div>

            {showsNow && nowMinutes >= timelineStart && nowMinutes <= timelineEnd && (
              <div className="absolute left-[78px] right-3 z-10 flex items-center" style={{ top: nowTop }}>
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-px flex-1 bg-primary" />
              </div>
            )}

            <div className="absolute left-[78px] right-0 top-0">
              {dayBlocks.length === 0 ? (
                <div className="mx-4 mt-10 rounded-md border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">No blocks scheduled.</div>
              ) : (
                positionedDayBlocks.map(({ block, column, columns }) => {
                  const style = getBlockStyle(block, column, columns, timelineStart, timelineEnd);
                  if (!style) return null;

                  const dashItem = dashboardBlocks.find((d) => d.block.id === block.id);
                  const blockHeight = typeof style.height === 'number' ? style.height : 0;
                  // 40px is the minimum block height (30-min block), so always show tags
                  const showTags = blockHeight >= 40 && !!dashItem;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      className="absolute overflow-hidden rounded-md border px-3 py-1.5 text-left text-cream-100 shadow-soft transition hover:scale-[1.01] hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={style}
                      onClick={() => setSelected({ block, date: dateKey })}
                    >
                      <div className="flex h-full items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="whitespace-normal break-words text-sm font-semibold leading-tight">{block.template.name}</div>
                          <div className="mt-0.5 truncate text-[11px] leading-tight text-cream-100">
                            {formatTime(block.startTime).toLowerCase()} - {formatTime(block.endTime).toLowerCase()}
                          </div>
                        </div>
                        {showTags && (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                            <span className="rounded bg-cream-100/20 px-1.5 py-0.5 text-[10px] font-semibold text-cream-100">
                              {dashItem!.completionPercentage}%
                            </span>
                            <span className="rounded bg-cream-100/20 px-1.5 py-0.5 text-[10px] font-semibold text-cream-100">
                              {getBlockDuration(block)}
                            </span>
                            {block.template.category && (
                              <span className="rounded bg-cream-100/20 px-1.5 py-0.5 text-[10px] font-semibold text-cream-100">
                                {block.template.category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-2xl font-semibold leading-tight">Today progress</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{todayCompletedBlocks} of {todayTrackableBlocks.length} blocks done</p>
                </div>
                <div className="shrink-0 rounded-md border bg-background px-3 py-2 text-right">
                  <div className="text-2xl font-semibold leading-none">{todayOverallCompletion}%</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">overall</div>
                </div>
              </div>
              <div className="space-y-4">
                {progressBars.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.done}/{item.total}</span>
                    </div>
                    <Progress value={item.value} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current block</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentBlock ? (
                <>
                  <button
                    type="button"
                    className="w-full rounded-md border p-4 text-left text-cream-100 transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      borderColor: withAlpha(currentBlock.block.template.color, 0.42),
                      backgroundColor: getSubtleColorFill(currentBlock.block.template.color)
                    }}
                    onClick={() => setSelected({ block: currentBlock.block, date: dateKey })}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold">{currentBlock.block.template.name}</div>
                        <div className="mt-1 text-sm text-cream-100">
                          {formatTime(currentBlock.block.startTime)} - {formatTime(currentBlock.block.endTime)}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-cream-100 px-2 py-1 text-xs font-semibold text-palette-roseDeep">
                        <Clock3 className="h-3.5 w-3.5" />
                        In progress
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{currentBlock.completionPercentage}% done</span>
                      <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{getBlockDuration(currentBlock.block)}</span>
                      {currentBlock.block.template.category && (
                        <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{currentBlock.block.template.category}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-palette-roseDeep"
                      onClick={() => setSelected({ block: currentBlock.block, date: dateKey })}
                    >
                      Open block
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted"
                      onClick={() => setSelected({ block: currentBlock.block, date: dateKey })}
                    >
                      Add note
                    </button>
                  </div>
                </>
              ) : upcomingBlock ? (
                <>
                  <button
                    type="button"
                    className="w-full rounded-md border p-4 text-left text-cream-100 transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      borderColor: withAlpha(upcomingBlock.block.template.color, 0.42),
                      backgroundColor: getSubtleColorFill(upcomingBlock.block.template.color)
                    }}
                    onClick={() => setSelected({ block: upcomingBlock.block, date: dateKey })}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold">{upcomingBlock.block.template.name}</div>
                        <div className="mt-1 text-sm text-cream-100">
                          {formatTime(upcomingBlock.block.startTime)} - {formatTime(upcomingBlock.block.endTime)}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-cream-100 px-2 py-1 text-xs font-semibold text-palette-roseDeep">
                        <Clock3 className="h-3.5 w-3.5" />
                        {getTimeUntilLabel(upcomingBlock.block, timelineStart, nowMinutes, showsNow)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{upcomingBlock.completionPercentage}% done</span>
                      <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{getBlockDuration(upcomingBlock.block)}</span>
                      {upcomingBlock.block.template.category && (
                        <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{upcomingBlock.block.template.category}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-palette-roseDeep"
                      onClick={() => setSelected({ block: upcomingBlock.block, date: dateKey })}
                    >
                      Open block
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted"
                      onClick={() => setSelected({ block: upcomingBlock.block, date: dateKey })}
                    >
                      Add note
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No active or upcoming blocks right now.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Remaining tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {remainingTasks.length ? (
                remainingTasks.map(({ task, instance, block }) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5 transition hover:border-primary/40"
                  >
                    {/* Checkbox to toggle completion */}
                    <button
                      type="button"
                      aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition",
                        task.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary"
                      )}
                      onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                    >
                      {task.completed && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>

                    {/* Task title + block name */}
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-sm font-medium", task.completed && "text-muted-foreground line-through")}>
                        {task.title}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {block?.template.name ?? instance.template.name} · {formatTime(instance.startTime).toLowerCase()}
                      </div>
                    </div>

                    {/* Redirect to block */}
                    <button
                      type="button"
                      aria-label="Open block"
                      className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => block && setSelected({ block, date: dateKey })}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">All tasks complete for today!</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {selected && (
        <BlockDetailModal
          block={selected.block}
          date={selected.date}
          onClose={() => setSelected(null)}
          onDelete={(id) => deleteBlock.mutate(id, { onSuccess: () => setSelected(null) })}
        />
      )}
      {dialogOpen && <CreateScheduleBlockDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initialDate={activeDate} />}
    </div>
  );
}
