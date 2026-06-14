import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "icon";
};

const variants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-soft hover:bg-palette-red800",
  secondary: "bg-secondary text-secondary-foreground hover:bg-mauve-200",
  outline: "border bg-card hover:border-primary hover:bg-muted",
  ghost: "hover:bg-muted hover:text-primary",
  destructive: "bg-palette-red600 text-primary-foreground shadow-soft hover:bg-palette-red800"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4",
  icon: "h-10 w-10"
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
