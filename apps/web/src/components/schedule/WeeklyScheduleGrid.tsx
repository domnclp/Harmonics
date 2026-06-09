import type { ScheduleBlock } from "../../types";
import { addDays, dayLabels, formatTime, getMonday, timeSlots, toDateKey, toMinutes } from "../../lib/date";
import { ScheduleBlockCard } from "./ScheduleBlockCard";

const slotHeight = 44;
const startMinutes = 6 * 60;

export function WeeklyScheduleGrid({
  blocks,
  weekStart,
  onOpenBlock
}: {
  blocks: ScheduleBlock[];
  weekStart: Date;
  onOpenBlock: (block: ScheduleBlock, date: string) => void;
}) {
  const monday = getMonday(weekStart);

  return (
    <div className="hidden overflow-x-auto rounded-lg border bg-card lg:block">
        <div className="grid min-w-[1080px] calendar-grid border-b">
          <div className="border-r p-3 text-xs font-medium text-muted-foreground">Time</div>
          {dayLabels.map((day, index) => (
            <div key={day} className="border-r p-3 last:border-r-0">
              <div className="font-semibold">{day}</div>
              <div className="text-xs text-muted-foreground">{toDateKey(addDays(monday, index))}</div>
            </div>
          ))}
        </div>
        <div className="grid min-w-[1080px] calendar-grid">
          <div className="border-r">
            {timeSlots.map((slot) => (
              <div key={slot} className="h-11 border-b px-3 py-2 text-xs text-muted-foreground">
                {formatTime(slot)}
              </div>
            ))}
          </div>
          {dayLabels.map((day, dayIndex) => {
            const date = toDateKey(addDays(monday, dayIndex));
            return (
              <div key={day} className="relative border-r last:border-r-0" style={{ height: timeSlots.length * slotHeight }}>
                {timeSlots.map((slot) => (
                  <div key={slot} className="h-11 border-b" />
                ))}
                {blocks
                  .filter((block) => block.dayOfWeek === dayIndex && (block.recurrenceRule !== "ONCE" || block.date?.slice(0, 10) === date))
                  .map((block) => {
                    const top = ((toMinutes(block.startTime) - startMinutes) / 30) * slotHeight;
                    const height = Math.max(42, ((toMinutes(block.endTime) - toMinutes(block.startTime)) / 30) * slotHeight - 6);
                    return (
                      <ScheduleBlockCard
                        key={block.id}
                        block={block}
                        compact
                        onClick={() => onOpenBlock(block, date)}
                        style={{
                          position: "absolute",
                          top,
                          left: 8,
                          right: 8,
                          height
                        }}
                      />
                    );
                  })}
              </div>
            );
          })}
        </div>
    </div>
  );
}
