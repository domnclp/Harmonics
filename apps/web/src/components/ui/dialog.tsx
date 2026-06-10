import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Dialog({ open, title, children, onClose, className }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-secondary p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className={cn("max-h-[92vh] w-full overflow-auto rounded-t-lg border bg-card shadow-soft sm:max-w-2xl sm:rounded-lg", className)}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
