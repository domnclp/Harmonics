import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { WeeklyScheduleGrid } from "../components/schedule/WeeklyScheduleGrid";
import { MobileDayTimeline } from "../components/schedule/MobileDayTimeline";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { addDays, getMonday, toDateKey } from "../lib/date";
import { blockOccursOnDate } from "../lib/recurrence";
import { useScheduleBlocks } from "../hooks/useScheduleBlocks";
import type { ScheduleBlock } from "../types";

type SelectedBlock = {
  block: ScheduleBlock;
  date: string;
};

export function SchedulePage() {
  const [weekStart, setWeekStart] = useState(getMonday());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const { data: blocks = [], isLoading, deleteBlock } = useScheduleBlocks();

  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index)));
  const weekBlockCount = blocks.filter((block) => weekDates.some((date) => blockOccursOnDate(block, date))).length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
            <h2 className="mt-1 text-2xl font-semibold">Weekly timetable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {toDateKey(weekStart)} to {toDateKey(weekEnd)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Blocks</div>
              <div className="text-lg font-semibold">{weekBlockCount}</div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(getMonday())} aria-label="Current week">
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
      ) : (
        <>
          <WeeklyScheduleGrid blocks={blocks} weekStart={weekStart} onOpenBlock={(block, date) => setSelected({ block, date })} />
          <MobileDayTimeline blocks={blocks} weekStart={weekStart} onOpenBlock={(block, date) => setSelected({ block, date })} />
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
