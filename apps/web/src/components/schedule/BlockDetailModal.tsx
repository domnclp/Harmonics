import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { failureReasons } from "../../lib/failureReasons";
import { dayLabels, formatTime } from "../../lib/date";
import { useBlockInstance } from "../../hooks/useBlockInstance";
import { useScheduleBlocks } from "../../hooks/useScheduleBlocks";
import { useTemplates } from "../../hooks/useTemplates";
import type { Completion, ScheduleBlock } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";

export function BlockDetailModal({
  block,
  date,
  onClose,
  onDelete
}: {
  block?: ScheduleBlock;
  date?: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const { data: instance, isLoading, updateHabit, updateTask, updateJournal } = useBlockInstance(block?.id, date);
  const { data: templates = [] } = useTemplates();
  const { updateBlock } = useScheduleBlocks();
  const [journal, setJournal] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    templateId: "",
    dayOfWeek: 0,
    startTime: "",
    endTime: "",
    recurrenceRule: "WEEKLY"
  });

  useEffect(() => {
    setJournal(instance?.journalEntry?.content ?? "");
  }, [instance?.journalEntry?.content]);

  useEffect(() => {
    if (!block) return;

    setEditValues({
      templateId: block.templateId,
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      recurrenceRule: block.recurrenceRule
    });
    setEditing(false);
  }, [block]);

  const saveScheduleBlock = async () => {
    if (!block) return;

    await updateBlock.mutateAsync({
      id: block.id,
      payload: {
        templateId: editValues.templateId,
        dayOfWeek: Number(editValues.dayOfWeek),
        startTime: editValues.startTime,
        endTime: editValues.endTime,
        recurrenceRule: editValues.recurrenceRule,
        date: editValues.recurrenceRule === "ONCE" ? date : null
      }
    });
    setEditing(false);
    onClose();
  };

  const hasHabits = Boolean(instance?.habitCompletions.length);

  return (
    <Dialog open={Boolean(block && date)} onClose={onClose} title={block?.template.name ?? "Block details"} className="sm:max-w-3xl">
      {!block || !date || isLoading || !instance ? (
        <p className="text-sm text-muted-foreground">Loading block instance...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{date}</Badge>
                <Badge>{formatTime(instance.startTime)} - {formatTime(instance.endTime)}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{instance.template.description || instance.template.category}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? "Cancel edit" : "Edit block"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(block.id)}>
                <Trash2 className="h-4 w-4" />
                Delete block
              </Button>
            </div>
          </div>

          {editing && (
            <form
              className="space-y-4 rounded-lg border bg-muted/30 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveScheduleBlock();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-template">Template</Label>
                  <Select
                    id="edit-template"
                    value={editValues.templateId}
                    onChange={(event) => setEditValues((values) => ({ ...values, templateId: event.target.value }))}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start time</Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={editValues.startTime}
                    onChange={(event) => setEditValues((values) => ({ ...values, startTime: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">End time</Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={editValues.endTime}
                    onChange={(event) => setEditValues((values) => ({ ...values, endTime: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-day">Repeat day</Label>
                  <Select
                    id="edit-day"
                    value={editValues.dayOfWeek}
                    onChange={(event) => setEditValues((values) => ({ ...values, dayOfWeek: Number(event.target.value) }))}
                  >
                    {dayLabels.map((day, index) => (
                      <option key={day} value={index}>{day}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-recurrence">Repeats</Label>
                  <Select
                    id="edit-recurrence"
                    value={editValues.recurrenceRule}
                    onChange={(event) => setEditValues((values) => ({ ...values, recurrenceRule: event.target.value }))}
                  >
                    <option value="WEEKLY">Every week</option>
                    <option value="MONTHLY">Every month</option>
                    <option value="CUSTOM">Custom</option>
                    <option value="ONCE">Does not repeat</option>
                  </Select>
                </div>
              </div>

              <Button type="submit" size="sm" disabled={updateBlock.isPending}>
                <Save className="h-4 w-4" />
                Save schedule changes
              </Button>
            </form>
          )}

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Completion</span>
              <span>{instance.completionPercentage}%</span>
            </div>
            <Progress value={instance.completionPercentage} />
          </div>

          <div className={`grid gap-5 ${hasHabits ? "lg:grid-cols-2" : ""}`}>
            {hasHabits && (
              <Checklist
                title="Habits"
                items={instance.habitCompletions}
                onToggle={(item, completed) => updateHabit.mutate({ id: item.id, completed, failureReason: completed ? null : item.failureReason })}
                onReason={(item, failureReason) => updateHabit.mutate({ id: item.id, failureReason })}
              />
            )}
            <Checklist
              title="Tasks"
              items={instance.taskCompletions}
              onToggle={(item, completed) => updateTask.mutate({ id: item.id, completed, failureReason: completed ? null : item.failureReason })}
              onReason={(item, failureReason) => updateTask.mutate({ id: item.id, failureReason })}
            />
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium" htmlFor="journal">Journal</label>
              {instance.template.journalPrompt && <p className="text-sm text-muted-foreground">{instance.template.journalPrompt}</p>}
            </div>
            <Textarea id="journal" value={journal} onChange={(event) => setJournal(event.target.value)} />
            <Button size="sm" onClick={() => updateJournal.mutate({ id: instance.journalEntry.id, content: journal })}>
              <Save className="h-4 w-4" />
              Save journal
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Checklist({
  title,
  items,
  onToggle,
  onReason
}: {
  title: string;
  items: Completion[];
  onToggle: (item: Completion, completed: boolean) => void;
  onReason: (item: Completion, reason: string | null) => void;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} in this template.</p>}
        {items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-md bg-muted/45 p-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={item.completed}
                onChange={(event) => onToggle(item, event.target.checked)}
              />
              <span className={item.completed ? "text-muted-foreground line-through" : ""}>{item.title}</span>
            </label>
            {!item.completed && (
              <Select value={item.failureReason ?? ""} onChange={(event) => onReason(item, event.target.value || null)}>
                <option value="">Failure reason</option>
                {failureReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </Select>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
