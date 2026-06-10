import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex gap-1 overflow-x-auto rounded-md bg-muted p-1", className)}>{children}</div>;
}

export function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-w-16 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
