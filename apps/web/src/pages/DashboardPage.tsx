import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ProgressSummary } from "../components/dashboard/ProgressSummary";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { apiFetch } from "../lib/api";
import { getSubtleColorFill, withAlpha } from "../lib/color";
import { addDays, formatTime, toDateKey, toMinutes } from "../lib/date";
import { blockOccursOnDate } from "../lib/recurrence";
import { getColumnStyle, getPositionedBlocks } from "../lib/scheduleLayout";
import { cn } from "../lib/utils";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import type { BlockInstance, ScheduleBlock } from "../types";
import { useState } from "react";

type SelectedBlock = { block: ScheduleBlock; date: string };

const timelineStart = 6 * 60;
const timelineEnd = 23 * 60;
const rowHeight = 52;
const timelineSlots = Array.from({ length: (timelineEnd - timelineStart) / 30 + 1 }, (_, index) => {
  const minutes = timelineStart + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});
const timelineHeight = timelineSlots.length * rowHeight;

const getDateLabel = (date: Date) => {
  const today = toDateKey(new Date());
  const key = toDateKey(date);
  if (key === today) return "today";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date).toLowerCase();
};

const getFullDateLabel = (date: Date) => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date);
const isSameDate = (left: Date, right: Date) => toDateKey(left) === toDateKey(right);

const getBlockStyle = (block: ScheduleBlock, column: number, columns: number) => {
  const start = Math.max(toMinutes(block.startTime), timelineStart);
  const end = Math.min(toMinutes(block.endTime), timelineEnd);
  const top = ((start - timelineStart) / 30) * rowHeight;
  const height = Math.max(((end - start) / 30) * rowHeight - 6, 50);

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const dateKey = toDateKey(activeDate);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const { data: blocks = [], deleteBlock } = useScheduleBlocks();
  const dayBlocks = blocks
    .filter((block) => blockOccursOnDate(block, dateKey))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const positionedDayBlocks = getPositionedBlocks(dayBlocks);

  const instances = useQuery({
    queryKey: ["dashboard-instances", dateKey],
    queryFn: () => apiFetch<BlockInstance[]>(`/api/block-instances?date=${dateKey}`)
  });

  const instanceData = instances.data ?? [];
  const completion = instanceData.length
    ? Math.round(instanceData.reduce((sum, item) => sum + item.completionPercentage, 0) / instanceData.length)
    : 0;
  const completedHabits = instanceData.flatMap((item) => item.habitCompletions).filter((item) => item.completed).length;
  const completedTasks = instanceData.flatMap((item) => item.taskCompletions).filter((item) => item.completed).length;
  const journals = instanceData.filter((item) => item.journalEntry?.content?.trim()).length;
  const nextBlock = dayBlocks.find((block) => block.endTime >= new Date().toTimeString().slice(0, 5));
  const now = new Date();
  const showsNow = isSameDate(activeDate, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((Math.min(Math.max(nowMinutes, timelineStart), timelineEnd) - timelineStart) / 30) * rowHeight;
  const firstBlock = dayBlocks[0];
  const lastBlock = dayBlocks[dayBlocks.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Dashboard</p>
          <h2 className="mt-1 text-3xl font-semibold">Daily overview</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getFullDateLabel(activeDate)} · Review the day&apos;s rhythm, progress, and next block.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-palette-roseDeep")}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add block
          </button>
          <Link
            to="/schedule"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-medium transition hover:border-primary hover:bg-muted"
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
                      {isHour ? formatTime(time).toLowerCase() : ""}
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
                positionedDayBlocks.map(({ block, column, columns }) => (
                  <button
                    key={block.id}
                    type="button"
                    className="absolute overflow-hidden rounded-md border px-3 py-1.5 text-left shadow-soft transition hover:scale-[1.01] hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={getBlockStyle(block, column, columns)}
                    onClick={() => setSelected({ block, date: dateKey })}
                  >
                    <div className="truncate text-sm font-semibold leading-tight">{block.template.name}</div>
                    <div className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                      {formatTime(block.startTime).toLowerCase()} - {formatTime(block.endTime).toLowerCase()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <ProgressSummary completion={completion} habits={completedHabits} tasks={completedTasks} journals={journals} />

          <Card>
            <CardHeader>
              <CardTitle>Current or next block</CardTitle>
            </CardHeader>
            <CardContent>
              {nextBlock ? (
                <button
                  type="button"
                  className="w-full rounded-md border p-4 text-left transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    borderColor: withAlpha(nextBlock.template.color, 0.42),
                    backgroundColor: getSubtleColorFill(nextBlock.template.color)
                  }}
                  onClick={() => setSelected({ block: nextBlock, date: dateKey })}
                >
                  <div className="font-semibold">{nextBlock.template.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(nextBlock.startTime)} - {formatTime(nextBlock.endTime)}
                  </div>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No remaining blocks for this day.</p>
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
