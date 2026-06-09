import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import type { ScheduleBlock } from "../../types";
import { formatTime } from "../../lib/date";
import { cn } from "../../lib/utils";

export function ScheduleBlockCard({
  block,
  onClick,
  compact = false,
  style
}: {
  block: ScheduleBlock;
  onClick: () => void;
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full overflow-hidden rounded-md border-l-4 bg-card p-3 text-left shadow-sm transition hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "space-y-1" : "space-y-2"
      )}
      style={{ borderLeftColor: block.template.color, ...style }}
      onClick={onClick}
    >
      <div className="truncate font-semibold">{block.template.name}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {formatTime(block.startTime)} - {formatTime(block.endTime)}
      </div>
      {!compact && <p className="line-clamp-2 text-xs text-muted-foreground">{block.template.description || block.template.category}</p>}
    </button>
  );
}
