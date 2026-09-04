import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { iconGroups, resolveIcon } from "../../lib/templateIcons";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";

/** "GraduationCap" -> "graduation cap", so a search for "cap" matches. */
const toWords = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Selected = resolveIcon(value);

  const select = (icon: string) => {
    onChange(icon);
    setOpen(false);
    // A stale search would hide most of the grid the next time it opens.
    setQuery("");
  };

  // The picker sits inside a form, so leaving it open while the user moves on
  // would obscure the fields below it.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return iconGroups;

    return iconGroups
      .map((group) => ({
        label: group.label,
        icons: Object.fromEntries(Object.entries(group.icons).filter(([name]) => toWords(name).includes(term)))
      }))
      .filter((group) => Object.keys(group.icons).length > 0);
  }, [query]);

  const hasResults = groups.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
      >
        <Selected className="h-5 w-5" aria-hidden />
        <span className="text-muted-foreground">{value}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 space-y-2 rounded-md border bg-background p-2 shadow-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8"
              placeholder="Search icons"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search icons"
              autoFocus
            />
          </div>

          <div className="max-h-56 space-y-3 overflow-y-auto">
            {hasResults ? (
              groups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                  <div className="grid grid-cols-8 gap-1">
                    {Object.entries(group.icons).map(([name, Icon]) => (
                      <button
                        key={name}
                        type="button"
                        // The name is the stored value; the title makes it
                        // discoverable for anyone hunting a specific icon.
                        title={name}
                        aria-label={name}
                        aria-pressed={value === name}
                        onClick={() => select(name)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent",
                          value === name ? "border-primary bg-accent" : "border-transparent"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">No icons match “{query}”</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
