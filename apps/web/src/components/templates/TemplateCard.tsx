import { Pencil, Trash2 } from "lucide-react";
import type { BlockTemplate } from "../../types";
import { resolveIcon } from "../../lib/templateIcons";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function TemplateCard({
  template,
  onEdit,
  onDelete
}: {
  template: BlockTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = resolveIcon(template.icon);
  const recentTasks = template.recentTasks ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md text-background" style={{ backgroundColor: template.color }}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{template.name}</CardTitle>
            <Badge>{template.category}</Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit template">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete template">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Habits</div>
          {template.habits.length ? (
            <ul className="space-y-1.5">
              {template.habits.map((habit) => (
                <li key={habit.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span>{habit.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No habits yet</p>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks</div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Recent</span>
          </div>
          {recentTasks.length ? (
            <ul className="space-y-1.5">
              {recentTasks.map((task) => (
                <li key={`${task.title}-${task.date}`} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span className={cn(task.completed && "text-muted-foreground line-through")}>{task.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          )}
          <p className="text-xs text-muted-foreground/80">Add tasks from the schedule or dashboard.</p>
        </div>
      </CardContent>
    </Card>
  );
}
