import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LoadError } from "../components/ui/load-error";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { Progress } from "../components/ui/progress";
import { apiFetch } from "../lib/api";
import { getSubtleColorFill, withAlpha } from "../lib/color";
import { addDays, formatTime, getTimeSlots, toDateKey, toMinutes } from "../lib/date";
import { blockOccursOnDate } from "../lib/recurrence";
import { getColumnStyle, getPositionedBlocks } from "../lib/scheduleLayout";
import { cn } from "../lib/utils";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import { useScheduleWindow } from "../hooks/useScheduleWindow";
import type { BlockInstance, ScheduleBlock } from "../types";
import { useEffect, useMemo, useState } from "react";

type SelectedBlock = { block: ScheduleBlock; date: string };

const rowHeight = 52;
const blockInset = 6;
const getTemplateHabits = (block: ScheduleBlock) => block.template.habits ?? [];
const getTemplateTasks = (block: ScheduleBlock) => block.template.tasks ?? [];
const getChecklistTotal = (block: ScheduleBlock) => getTemplateHabits(block).length + getTemplateTasks(block).length;

const getSavedCompletion = (instance?: BlockInstance) => {
  if (!instance) return 0;

  const items = [...instance.habitCompletions, ...instance.taskCompletions];
  if (!items.length) return instance.completionPercentage;

  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
};

const getDateLabel = (date: Date) => {
  const today = toDateKey(new Date());
  const key = toDateKey(date);
  if (key === today) return "today";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date).toLowerCase();
};

const getFullDateLabel = (date: Date) => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date);
const isSameDate = (left: Date, right: Date) => toDateKey(left) === toDateKey(right);
const getBlockDuration = (block: ScheduleBlock) => {
  const minutes = Math.max(0, toMinutes(block.endTime) - toMinutes(block.startTime));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${minutes} min`;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
};

const getTimeUntilLabel = (block: ScheduleBlock, activeDate: Date, now: Date) => {
  if (!isSameDate(activeDate, now)) return `Starts ${formatTime(block.startTime).toLowerCase()}`;

  const minutesUntil = toMinutes(block.startTime) - (now.getHours() * 60 + now.getMinutes());
  if (minutesUntil <= 0) return "In progress";

  const hours = Math.floor(minutesUntil / 60);
  const minutes = minutesUntil % 60;
  if (!hours) return `Starts in ${minutes} min`;
  if (!minutes) return `Starts in ${hours} hr`;
  return `Starts in ${hours} hr ${minutes} min`;
};

const getBlockStyle = (block: ScheduleBlock, column: number, columns: number, timelineStart: number, timelineEnd: number) => {
  const start = Math.max(toMinutes(block.startTime), timelineStart);
  const end = Math.min(toMinutes(block.endTime), timelineEnd);
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const dateKey = toDateKey(activeDate);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const scheduleWindow = useScheduleWindow();
  const timelineStart = toMinutes(scheduleWindow.startTime);
  const timelineEnd = toMinutes(scheduleWindow.endTime);
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

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => blockOccursOnDate(block, dateKey))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [blocks, dateKey]
  );
  const positionedDayBlocks = useMemo(() => getPositionedBlocks(dayBlocks), [dayBlocks]);

  const instances = useQuery({
    queryKey: ["dashboard-instances", dateKey],
    queryFn: () => apiFetch<BlockInstance[]>(`/api/block-instances?date=${dateKey}`)
  });

  const showsNow = isSameDate(activeDate, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const instancesByBlockId = useMemo(() => {
    const entries = (instances.data ?? []).map((instance) => [instance.scheduleBlockId, instance] as const);
    return new Map(entries);
  }, [instances.data]);

  const dashboardBlocks = useMemo(
    () =>
      dayBlocks.map((block) => {
        const instance = instancesByBlockId.get(block.id);
        const completionPercentage = getSavedCompletion(instance);
        const checklistTotal = getChecklistTotal(block);
        const isComplete = checklistTotal > 0 && completionPercentage === 100;

        return {
          block,
          instance,
          completionPercentage,
          isComplete,
          startMinutes: toMinutes(block.startTime),
          endMinutes: toMinutes(block.endTime)
        };
      }),
    [dayBlocks, instancesByBlockId]
  );

  const { completion, completedHabits, totalHabits, completedTasks, totalTasks } = useMemo(() => {
    const habitsByBlock = new Map((instances.data ?? []).map((instance) => [instance.scheduleBlockId, instance.habitCompletions] as const));
    const tasksByBlock = new Map((instances.data ?? []).map((instance) => [instance.scheduleBlockId, instance.taskCompletions] as const));

    const totalBlockProgress = dashboardBlocks.reduce((sum, item) => sum + item.completionPercentage, 0);
    const habits = dayBlocks.flatMap((block) => habitsByBlock.get(block.id) ?? getTemplateHabits(block).map(() => ({ completed: false })));
    const tasks = dayBlocks.flatMap((block) => tasksByBlock.get(block.id) ?? getTemplateTasks(block).map(() => ({ completed: false })));

    return {
      completion: dashboardBlocks.length ? Math.round(totalBlockProgress / dashboardBlocks.length) : 0,
      completedHabits: habits.filter((item) => item.completed).length,
      totalHabits: habits.length,
      completedTasks: tasks.filter((item) => item.completed).length,
      totalTasks: tasks.length
    };
  }, [dashboardBlocks, dayBlocks, instances.data]);

  const completedBlocks = dashboardBlocks.filter((item) => item.isComplete).length;
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
  const weeklyAverage = instances.data?.length ? completion : 0;
  const progressBars = [
    {
      label: "Blocks",
      done: completedBlocks,
      total: dayBlocks.length,
      value: dayBlocks.length ? Math.round((completedBlocks / dayBlocks.length) * 100) : 0
    },
    {
      label: "Habits",
      done: completedHabits,
      total: totalHabits,
      value: totalHabits ? Math.round((completedHabits / totalHabits) * 100) : 0
    },
    {
      label: "Tasks",
      done: completedTasks,
      total: totalTasks,
      value: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  ];
  const nowTop = ((Math.min(Math.max(nowMinutes, timelineStart), timelineEnd) - timelineStart) / 30) * rowHeight;
  const firstBlock = dayBlocks[0];
  const lastBlock = dayBlocks[dayBlocks.length - 1];

  return (
    <div className="space-y-6">
      {blocksIsError && <LoadError label="schedule blocks" error={blocksError} />}
      {instances.isError && <LoadError label="dashboard instances" error={instances.error} />}

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
                      onClick={() => setActiveDate((date) => addDays(date, -1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="h-8 min-w-24 rounded-sm px-3 text-sm font-semibold transition hover:bg-muted"
                      onClick={() => setActiveDate(new Date())}
                    >
                      {getDateLabel(activeDate)}
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-sm transition hover:bg-muted"
                      aria-label="Next day"
                      onClick={() => setActiveDate((date) => addDays(date, 1))}
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
              {timelineSlots.map((time) => {
                const isHour = time.endsWith(":00");
                return (
                  <div
                    key={time}
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

                  return (
                    <button
                      key={block.id}
                      type="button"
                      className="absolute overflow-hidden rounded-md border px-3 py-1.5 text-left text-cream-100 shadow-soft transition hover:scale-[1.01] hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={style}
                      onClick={() => setSelected({ block, date: dateKey })}
                    >
                      <div className="whitespace-normal break-words text-sm font-semibold leading-tight">{block.template.name}</div>
                      <div className="mt-0.5 truncate text-[11px] leading-tight text-cream-100">
                        {formatTime(block.startTime).toLowerCase()} - {formatTime(block.endTime).toLowerCase()}
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
                  <p className="mt-1 text-sm text-muted-foreground">{completedBlocks} blocks done, {remainingBlocks.length} left</p>
                </div>
                <div className="shrink-0 rounded-md border bg-background px-3 py-2 text-right">
                  <div className="text-2xl font-semibold leading-none">{completion}%</div>
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
              <CardTitle>Blocks to tick</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attentionBlocks.length ? (
                <>
                  <div className="space-y-3">
                    {attentionBlocks.map((item) => {
                      const block = item.block;
                      const isOverdue = overdueBlocks.some((overdue) => overdue.block.id === block.id);
                      const statusLabel = isOverdue ? "Overdue" : getTimeUntilLabel(block, activeDate, now);

                      return (
                        <button
                          key={block.id}
                          type="button"
                          className="w-full rounded-md border p-4 text-left text-cream-100 transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{
                            borderColor: withAlpha(block.template.color, 0.42),
                            backgroundColor: getSubtleColorFill(block.template.color)
                          }}
                          onClick={() => setSelected({ block, date: dateKey })}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-lg font-semibold">{block.template.name}</div>
                              <div className="mt-1 text-sm text-cream-100">
                                {formatTime(block.startTime)} - {formatTime(block.endTime)}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-cream-100 px-2 py-1 text-xs font-semibold text-palette-roseDeep">
                              <Clock3 className="h-3.5 w-3.5" />
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{item.completionPercentage}% done</span>
                            <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{getBlockDuration(block)}</span>
                            <span className="rounded-md bg-cream-100 px-2 py-1 font-semibold text-palette-roseDeep">{block.template.category}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-palette-roseDeep"
                      onClick={() => primaryBlock && setSelected({ block: primaryBlock.block, date: dateKey })}
                    >
                      Open block
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted"
                      onClick={() => primaryBlock && setSelected({ block: primaryBlock.block, date: dateKey })}
                    >
                      Add note
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">All scheduled blocks are complete for this day.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Remaining today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {remainingBlocks.length ? (
                remainingBlocks.slice(0, 4).map((item) => (
                  <button
                    key={item.block.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md border bg-background p-3 text-left transition hover:border-primary hover:bg-muted"
                    onClick={() => setSelected({ block: item.block, date: dateKey })}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{item.block.template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(item.block.startTime).toLowerCase()} - {formatTime(item.block.endTime).toLowerCase()}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-primary">{item.completionPercentage}%</span>
                  </button>
                ))
              ) : (
                <p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">Nothing unfinished here.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Journal prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {primaryBlock?.block.template.journalPrompt?.trim() || "What worked well today, and what should change tomorrow?"}
                </p>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border bg-card px-3 text-sm font-medium transition hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  onClick={() => primaryBlock && setSelected({ block: primaryBlock.block, date: dateKey })}
                  disabled={!primaryBlock}
                >
                  Write journal
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Weekly insight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{weeklyAverage}%</div>
                    <div className="text-sm text-muted-foreground">Completion snapshot</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {completion >= 80 ? "Strong rhythm today. Keep the remaining blocks simple and focused." : "A lighter next step can keep the day moving."}
                </p>
              </CardContent>
            </Card>
          </div>
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
