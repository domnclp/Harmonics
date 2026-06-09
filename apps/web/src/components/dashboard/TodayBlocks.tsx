import type { ScheduleBlock } from "../../types";
import { ScheduleBlockCard } from "../schedule/ScheduleBlockCard";

export function TodayBlocks({
  blocks,
  date,
  onOpenBlock
}: {
  blocks: ScheduleBlock[];
  date: string;
  onOpenBlock: (block: ScheduleBlock, date: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Today&apos;s schedule</h2>
        <span className="text-sm text-muted-foreground">{date}</span>
      </div>
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No routine blocks scheduled today.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {blocks.map((block) => (
            <ScheduleBlockCard key={block.id} block={block} onClick={() => onOpenBlock(block, date)} />
          ))}
        </div>
      )}
    </section>
  );
}
