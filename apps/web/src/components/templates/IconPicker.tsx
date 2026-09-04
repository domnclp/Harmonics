import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { iconGroups, resolveIcon } from "../../lib/templateIcons";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";

/** "GraduationCap" -> "graduation cap", so a search for "cap" matches. */
const toWords = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [query, setQuery] = useState("");
  const Selected = resolveIcon(value);

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
          <Selected className="h-5 w-5" aria-hidden />
        </span>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search icons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search icons"
          />
        </div>
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto rounded-md border p-2">
        {hasResults ? (
          groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {Object.entries(group.icons).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    // The name is the stored value; the title makes it discoverable
                    // for anyone hunting a specific icon.
                    title={name}
                    aria-label={name}
                    aria-pressed={value === name}
                    onClick={() => onChange(name)}
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
  );
}
