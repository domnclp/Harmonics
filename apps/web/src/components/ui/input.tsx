import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-75",
        className
      )}
      {...props}
    />
  );
}
