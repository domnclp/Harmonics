import { useEffect, useState } from "react";
import type { ScheduleBlock } from "../../types";
import { formatTime, getDateForDayOfWeek, getDayOptions, getLogicalMinutes, getScheduleDate, toDateKey, toMinutes, type WeekStartsOn } from "../../lib/date";
import { blockOccursOnDate } from "../../lib/recurrence";
import { cn } from "../../lib/utils";
import { useScheduleWindow } from "../../hooks/useScheduleWindow";
import { Tabs, TabButton } from "../ui/tabs";
import { ScheduleBlockCard } from "./ScheduleBlockCard";

export function MobileDayTimeline({
  blocks,
  weekStart,
  weekStartsOn,
  activeDays,
  onOpenBlock
}: {
  blocks: ScheduleBlock[];
  weekStart: Date;
  weekStartsOn: WeekStartsOn;
  activeDays?: number[];
  onOpenBlock: (block: ScheduleBlock, date: string) => void;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const scheduleWindow = useScheduleWindow();
  const dayStart = toMinutes(scheduleWindow.startTime);
  const todayKey = toDateKey(getScheduleDate(new Date(), scheduleWindow.startTime, scheduleWindow.endTime));
  const days = getDayOptions(weekStartsOn, activeDays).map(({ label, dayOfWeek }) => {
    const dayDate = toDateKey(getDateForDayOfWeek(weekStart, dayOfWeek, weekStartsOn));
    const dayBlocks = blocks
      .filter((block) => blockOccursOnDate(block, dayDate, activeDays))
      .sort((a, b) => getLogicalMinutes(a.startTime, dayStart) - getLogicalMinutes(b.startTime, dayStart));
    return { label: label.slice(0, 3), date: dayDate, blocks: dayBlocks };
  });

  useEffect(() => {
    if (activeDay >= days.length) setActiveDay(0);
  }, [activeDay, days.length]);

  const date = days[activeDay]?.date ?? "";
  const dayBlocks = days[activeDay]?.blocks ?? [];

  return (
    <div className="space-y-4 lg:hidden">
      <Tabs className="bg-card shadow-soft">
        {days.map((day, index) => (
          <TabButton key={day.date} active={activeDay === index} onClick={() => setActiveDay(index)}>
            <span className="block">{day.label}</span>
            <span className="block text-[11px] opacity-70">{day.date.slice(5)}</span>
            <span className="mt-1 block text-[10px]">{day.blocks.length}</span>
          </TabButton>
        ))}
      </Tabs>
      <div className={cn("rounded-lg border bg-card p-3 shadow-soft", date === todayKey ? "border-primary" : "")}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">{date}</div>
            <div className="text-xs text-muted-foreground">{dayBlocks.length} blocks</div>
          </div>
          {date === todayKey && <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-primary">Today</span>}
        </div>
        <div className="space-y-3">
          {dayBlocks.length === 0 && <div className="rounded-md border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">No blocks on this day.</div>}
        {dayBlocks.map((block) => (
            <div key={block.id} className="grid grid-cols-[64px_1fr] gap-3">
              <div className="pt-3 text-right text-xs font-semibold text-muted-foreground">{formatTime(block.startTime).toLowerCase()}</div>
              <ScheduleBlockCard block={block} onClick={() => onOpenBlock(block, date)} />
            </div>
        ))}
        </div>
      </div>
    </div>
  );
}
