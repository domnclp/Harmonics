import { useState } from "react";
import type { ScheduleBlock } from "../../types";
import { addDays, dayShortLabels, getMonday, toDateKey } from "../../lib/date";
import { Tabs, TabButton } from "../ui/tabs";
import { ScheduleBlockCard } from "./ScheduleBlockCard";

export function MobileDayTimeline({
  blocks,
  weekStart,
  onOpenBlock
}: {
  blocks: ScheduleBlock[];
  weekStart: Date;
  onOpenBlock: (block: ScheduleBlock, date: string) => void;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const monday = getMonday(weekStart);
  const date = toDateKey(addDays(monday, activeDay));
  const dayBlocks = blocks.filter((block) => block.dayOfWeek === activeDay && (block.recurrenceRule !== "ONCE" || block.date?.slice(0, 10) === date));

  return (
    <div className="space-y-4 lg:hidden">
      <Tabs>
        {dayShortLabels.map((label, index) => (
          <TabButton key={label} active={activeDay === index} onClick={() => setActiveDay(index)}>
            <span className="block">{label}</span>
            <span className="block text-[11px] opacity-70">{toDateKey(addDays(monday, index)).slice(5)}</span>
          </TabButton>
        ))}
      </Tabs>
      <div className="space-y-3">
        {dayBlocks.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No blocks on this day.</div>}
        {dayBlocks.map((block) => (
          <ScheduleBlockCard key={block.id} block={block} onClick={() => onOpenBlock(block, date)} />
        ))}
      </div>
    </div>
  );
}
