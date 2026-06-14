import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import type { ScheduleBlock } from "../../types";
import { getSubtleColorFill, withAlpha } from "../../lib/color";
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
  const isPositioned = style?.position === "absolute";

  return (
    <button
      type="button"
      className={cn(
        "overflow-hidden rounded-md border p-3 text-cream-100 shadow-soft transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isPositioned ? "w-auto" : "w-full",
        compact ? "flex items-center justify-center text-center" : "space-y-2 text-left"
      )}
      style={{
        borderColor: withAlpha(block.template.color, 0.42),
        backgroundColor: getSubtleColorFill(block.template.color),
        ...style
      }}
      onClick={onClick}
    >
      <div className={cn("min-w-0", compact ? "w-full px-1" : "")}>
        <div className="whitespace-normal break-words font-semibold leading-snug">{block.template.name}</div>
        {!compact && (
          <div className="flex items-center gap-1 text-xs text-cream-100">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(block.startTime)} - {formatTime(block.endTime)}
          </div>
        )}
      </div>
      {!compact && <p className="line-clamp-2 text-xs text-cream-100">{block.template.description || block.template.category}</p>}
    </button>
  );
}
