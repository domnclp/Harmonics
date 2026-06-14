import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { LoadError } from "../components/ui/load-error";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { WeeklyScheduleGrid } from "../components/schedule/WeeklyScheduleGrid";
import { MobileDayTimeline } from "../components/schedule/MobileDayTimeline";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { addDays, getWeekStart, toDateKey } from "../lib/date";
import { blockOccursOnDate } from "../lib/recurrence";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import { useWeekStartsOn } from "../hooks/useWeekStartsOn";
import type { ScheduleBlock } from "../types";

type SelectedBlock = {
  block: ScheduleBlock;
  date: string;
};

const formatWeekDate = (date: Date) => new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date);

export function SchedulePage() {
  const weekStartsOn = useWeekStartsOn();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), weekStartsOn));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const { data: blocks = [], error, isError, isLoading, deleteBlock } = useScheduleBlocks();

  useEffect(() => {
    setWeekStart((current) => getWeekStart(current, weekStartsOn));
  }, [weekStartsOn]);

  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index)));
  const weekBlockCount = blocks.filter((block) => weekDates.some((date) => blockOccursOnDate(block, date))).length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-stretch">
          <div className="flex min-h-14 flex-col justify-center">
            <h2 className="mt-1 text-2xl font-semibold">
              Weekly timetable{" "}
              <span className="align-baseline text-sm font-medium text-muted-foreground">
                — {formatWeekDate(weekStart)} to {formatWeekDate(weekEnd)}
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="flex h-10 min-w-20 items-center justify-center gap-2 rounded-md border bg-background px-3">
              <span className="text-xs text-muted-foreground">Blocks</span>
              <span className="text-sm font-semibold">{weekBlockCount}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(getWeekStart(new Date(), weekStartsOn))} aria-label="Current week">
              <CalendarDays className="h-4 w-4" />
              This week
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add block
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading schedule...</p>
      ) : isError ? (
        <LoadError label="schedule" error={error} />
      ) : (
        <>
          <WeeklyScheduleGrid blocks={blocks} weekStart={weekStart} weekStartsOn={weekStartsOn} onOpenBlock={(block, date) => setSelected({ block, date })} />
          <MobileDayTimeline blocks={blocks} weekStart={weekStart} weekStartsOn={weekStartsOn} onOpenBlock={(block, date) => setSelected({ block, date })} />
        </>
      )}

      {dialogOpen && <CreateScheduleBlockDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initialDate={weekStart} />}
      {selected && (
        <BlockDetailModal
          block={selected.block}
          date={selected.date}
          onClose={() => setSelected(null)}
          onDelete={(id) => deleteBlock.mutate(id, { onSuccess: () => setSelected(null) })}
        />
      )}
    </div>
  );
}
