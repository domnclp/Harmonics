import { BookOpen, Brain, Coffee, Dumbbell, Moon, Pencil, Sunrise, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockTemplate } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const icons: Record<string, LucideIcon> = { Sunrise, Dumbbell, BookOpen, Brain, Coffee, Moon };

export function TemplateCard({
  template,
  onEdit,
  onDelete
}: {
  template: BlockTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = icons[template.icon] ?? Sunrise;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md text-white" style={{ backgroundColor: template.color }}>
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
      <CardContent>
        {template.description && <p className="mb-4 text-sm text-muted-foreground">{template.description}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium">Habits</div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {template.habits.length ? template.habits.map((habit) => <li key={habit.id}>{habit.title}</li>) : <li>No habits yet</li>}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Tasks</div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {template.tasks.length ? template.tasks.map((task) => <li key={task.id}>{task.title}</li>) : <li>No tasks yet</li>}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
