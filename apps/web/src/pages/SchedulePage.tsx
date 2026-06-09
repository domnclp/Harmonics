import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { CreateScheduleBlockDialog } from "../components/schedule/CreateScheduleBlockDialog";
import { WeeklyScheduleGrid } from "../components/schedule/WeeklyScheduleGrid";
import { MobileDayTimeline } from "../components/schedule/MobileDayTimeline";
import { BlockDetailModal } from "../components/schedule/BlockDetailModal";
import { addDays, getMonday, toDateKey } from "../lib/date";
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Weekly timetable</h2>
          <p className="text-sm text-muted-foreground">
            {toDateKey(weekStart)} to {toDateKey(weekEnd)} · Click a block to edit it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(getMonday())} aria-label="Current week">
            <CalendarTodayIcon />
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

function CalendarTodayIcon() {
  return <span className="text-xs font-semibold">Now</span>;
}
