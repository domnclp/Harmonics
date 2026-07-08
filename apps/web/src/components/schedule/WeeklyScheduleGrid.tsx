import type { ScheduleBlock } from "../../types";
import {
  addDays,
  formatTime,
  getDayOptions,
  getLogicalEndMinutes,
  getLogicalMinutes,
  getScheduleDate,
  getTimeSlots,
  toDateKey,
  toMinutes,
  type WeekStartsOn
} from "../../lib/date";
import { blockOccursOnDate } from "../../lib/recurrence";
import { getColumnStyle, getPositionedBlocks } from "../../lib/scheduleLayout";
import { cn } from "../../lib/utils";
import { useScheduleWindow } from "../../hooks/useScheduleWindow";
import { ScheduleBlockCard } from "./ScheduleBlockCard";

const slotHeight = 44;
const blockInset = 5;

export function WeeklyScheduleGrid({
  blocks,
  weekStart,
  weekStartsOn,
  onOpenBlock
}: {
  blocks: ScheduleBlock[];
  weekStart: Date;
  weekStartsOn: WeekStartsOn;
  onOpenBlock: (block: ScheduleBlock, date: string) => void;
}) {
  const scheduleWindow = useScheduleWindow();
  const startMinutes = toMinutes(scheduleWindow.startTime);
  const endMinutes = getLogicalEndMinutes(scheduleWindow.startTime, scheduleWindow.endTime, startMinutes);
  const timeSlots = getTimeSlots(scheduleWindow.startTime, scheduleWindow.endTime);
  const todayKey = toDateKey(getScheduleDate(new Date(), scheduleWindow.startTime, scheduleWindow.endTime));
  const weekDays = getDayOptions(weekStartsOn).map(({ label }, index) => {
    const date = toDateKey(addDays(weekStart, index));
    const dayBlocks = blocks.filter((block) => blockOccursOnDate(block, date));
    return { day: label, date, blocks: dayBlocks };
  });

  return (
    <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-soft lg:block">
      <div className="grid min-w-[1120px] calendar-grid sticky top-0 z-20 border-b bg-card">
        <div className="border-r bg-muted/60 p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</div>
        {weekDays.map(({ day, date, blocks: dayBlocks }) => (
          <div
            key={day}
            className={cn("border-r p-3 last:border-r-0", date === todayKey ? "bg-palette-red50" : "bg-card")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{day}</div>
                <div className="text-xs text-muted-foreground">{date}</div>
              </div>
              <span className="rounded-md border bg-background px-2 py-1 text-xs font-semibold">{dayBlocks.length}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-[1120px] calendar-grid">
        <div className="sticky left-0 z-10 border-r bg-card">
          {timeSlots.map((slot, index) => {
            const isHour = slot.endsWith(":00");
            return (
              <div
                key={`${slot}-${index}`}
                className={cn("h-11 border-b px-3 py-2 text-right text-xs", isHour ? "font-semibold text-foreground" : "text-muted-foreground")}
              >
                {formatTime(slot).toLowerCase()}
              </div>
            );
          })}
        </div>
        {weekDays.map(({ day, date, blocks: dayBlocks }) => {
          const positioned = getPositionedBlocks(dayBlocks, startMinutes);
          return (
            <div
              key={day}
              className={cn("relative overflow-hidden border-r last:border-r-0", date === todayKey ? "bg-palette-red50/40" : "bg-background")}
              style={{ height: timeSlots.length * slotHeight }}
            >
              <div className="absolute inset-0">
                {timeSlots.map((slot, index) => (
                  <div key={`${slot}-${index}`} className={cn("h-11 border-b", slot.endsWith(":00") ? "bg-card/35" : "")} />
                ))}
              </div>
              {dayBlocks.length === 0 && (
                <div className="absolute left-3 right-3 top-4 rounded-md border border-dashed bg-card/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  No blocks
                </div>
              )}
              {positioned.map(({ block, column, columns }) => {
                const visibleStart = Math.max(getLogicalMinutes(block.startTime, startMinutes), startMinutes);
                const visibleEnd = Math.min(getLogicalEndMinutes(block.startTime, block.endTime, startMinutes), endMinutes);
                if (visibleEnd <= visibleStart) return null;

                const top = ((visibleStart - startMinutes) / 30) * slotHeight + blockInset;
                const height = Math.max(34, ((visibleEnd - visibleStart) / 30) * slotHeight - blockInset * 2);
                return (
                  <ScheduleBlockCard
                    key={block.id}
                    block={block}
                    compact
                    onClick={() => onOpenBlock(block, date)}
                    style={{
                      position: "absolute",
                      top,
                      height,
                      ...getColumnStyle(column, columns, 6)
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
