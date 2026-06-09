import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ProgressSummary } from "../components/dashboard/ProgressSummary";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { apiFetch } from "../lib/api";
import { addDays, dayOfWeekMondayFirst, formatTime, toDateKey, toMinutes } from "../lib/date";
import { cn } from "../lib/utils";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import type { BlockInstance, ScheduleBlock } from "../types";
import { useState } from "react";

type SelectedBlock = { block: ScheduleBlock; date: string };

const timelineStart = 6 * 60;
const timelineEnd = 23 * 60;
const rowHeight = 45;
const timelineSlots = Array.from({ length: (timelineEnd - timelineStart) / 30 + 1 }, (_, index) => {
  const minutes = timelineStart + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

const getDateLabel = (date: Date) => {
  const today = toDateKey(new Date());
  const key = toDateKey(date);
  if (key === today) return "today";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date).toLowerCase();
};

const getFullDateLabel = (date: Date) => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date);

const getBlockStyle = (block: ScheduleBlock) => {
  const start = Math.max(toMinutes(block.startTime), timelineStart);
  const end = Math.min(toMinutes(block.endTime), timelineEnd);
  const top = ((start - timelineStart) / 30) * rowHeight;
  const height = Math.max(((end - start) / 30) * rowHeight - 6, rowHeight - 8);

  return {
    top,
    height,
    borderColor: block.template.color,
    backgroundColor: `${block.template.color}18`
  };
};

export function DashboardPage() {
  const [activeDate, setActiveDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const dateKey = toDateKey(activeDate);
  const activeDayIndex = dayOfWeekMondayFirst(activeDate);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const { data: blocks = [], deleteBlock } = useScheduleBlocks();
  const dayBlocks = blocks
    .filter((block) => block.dayOfWeek === activeDayIndex && (block.recurrenceRule !== "ONCE" || block.date?.slice(0, 10) === dateKey))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
            className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90")}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add block
          </button>
          <Link
            to="/schedule"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition hover:bg-muted"
          >
            <CalendarDays className="h-4 w-4" />
            Weekly schedule
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(380px,44%)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-lg border bg-card shadow-soft xl:sticky xl:top-20 xl:self-start" aria-label="Single day calendar">
          <div className="border-b bg-muted/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Day calendar</h3>
                <p className="text-xs text-muted-foreground">{dateKey}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border bg-background p-1 shadow-sm">
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
                <span className="rounded-md bg-background px-3 py-1 text-sm font-semibold">{completion}%</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[765px] bg-background/70">
            <div className="absolute left-0 top-0 w-full">
              {timelineSlots.map((time) => (
                <div key={time} className="grid border-t border-border/80" style={{ gridTemplateColumns: "72px 1fr", height: rowHeight }}>
                  <div className="pr-3 pt-2 text-right text-[11px] font-medium uppercase text-muted-foreground">{formatTime(time).toLowerCase()}</div>
                  <div className="border-l border-border/80" />
                </div>
              ))}
            </div>

            <div className="absolute left-[72px] right-0 top-0">
              {dayBlocks.length === 0 ? (
                <div className="mx-3 mt-10 rounded-md border border-dashed bg-card p-5 text-center text-sm text-muted-foreground">No blocks scheduled.</div>
              ) : (
                dayBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className="absolute left-3 right-3 overflow-hidden rounded-md border-l-4 bg-card px-3 py-2 text-left shadow-sm transition hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={getBlockStyle(block)}
                    onClick={() => setSelected({ block, date: dateKey })}
                  >
                    <div className="truncate text-sm font-semibold leading-tight">{block.template.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
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
                  className="w-full rounded-md border p-4 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
