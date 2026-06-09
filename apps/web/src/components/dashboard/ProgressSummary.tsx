import { BookText, CheckCircle2, ListChecks } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";

export function ProgressSummary({
  completion,
  habits,
  tasks,
  journals
}: {
  completion: number;
  habits: number;
  tasks: number;
  journals: number;
}) {
  const stats = [
    { label: "Habits done", value: habits, icon: CheckCircle2 },
    { label: "Tasks done", value: tasks, icon: ListChecks },
    { label: "Journal entries", value: journals, icon: BookText }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Today completion</span>
            <span className="text-2xl font-semibold">{completion}%</span>
          </div>
          <Progress value={completion} />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
