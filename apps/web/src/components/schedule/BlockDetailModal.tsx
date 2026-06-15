import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTime, getDayOptions } from "../../lib/date";
import { recurrenceOptions } from "../../lib/recurrence";
import { useBlockInstance } from "../../hooks/useBlockInstance";
import { useScheduleBlocks } from "../../hooks/useScheduleBlocks";
import { useTemplates } from "../../hooks/useTemplates";
import { useWeekStartsOn } from "../../hooks/useWeekStartsOn";
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
  const { data: instance, isLoading, updateHabit, updateTask, updateJournal, updateInstanceCompletion } = useBlockInstance(block?.id, date);
  const { data: templates = [] } = useTemplates();
  const { updateBlock } = useScheduleBlocks();
  const weekStartsOn = useWeekStartsOn();
  const dayOptions = getDayOptions(weekStartsOn);
  const [journal, setJournal] = useState("");
  const [editing, setEditing] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
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
        date
      }
    });
    setEditing(false);
    onClose();
  };

  const hasHabits = Boolean(instance?.habitCompletions.length);
  const completionItems = instance ? [...instance.habitCompletions, ...instance.taskCompletions] : [];
  const showsDayPicker = editValues.recurrenceRule === "WEEKLY" || editValues.recurrenceRule === "CUSTOM";
  const completionUpdatePending = updateHabit.isPending || updateTask.isPending || updateJournal.isPending || updateInstanceCompletion.isPending;

  const saveProgress = async () => {
    if (!instance) return;

    await updateJournal.mutateAsync({ id: instance.journalEntry.id, content: journal });
    onClose();
  };

  const markIncomplete = async () => {
    if (!instance) return;

    const reason = incompleteReason.trim() || null;
    await updateInstanceCompletion.mutateAsync({
      id: instance.id,
      completed: false,
      failureReason: reason,
      journalContent: journal
    });
    setIncompleteDialogOpen(false);
    setIncompleteReason("");
  };

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
              className="space-y-4 rounded-lg border bg-muted p-4"
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
                {showsDayPicker && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-day">Repeat day</Label>
                    <Select
                      id="edit-day"
                      value={editValues.dayOfWeek}
                      onChange={(event) => setEditValues((values) => ({ ...values, dayOfWeek: Number(event.target.value) }))}
                    >
                      {dayOptions.map(({ label, dayOfWeek }) => (
                        <option key={label} value={dayOfWeek}>{label}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-recurrence">Repeats</Label>
                  <Select
                    id="edit-recurrence"
                    value={editValues.recurrenceRule}
                    onChange={(event) => setEditValues((values) => ({ ...values, recurrenceRule: event.target.value }))}
                  >
                    {recurrenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    {editValues.recurrenceRule === "ONCE" && <option value="ONCE">Does not repeat</option>}
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
              />
            )}
            <Checklist
              title="Tasks"
              items={instance.taskCompletions}
              onToggle={(item, completed) => updateTask.mutate({ id: item.id, completed, failureReason: completed ? null : item.failureReason })}
            />
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium" htmlFor="journal">Journal</label>
              {instance.template.journalPrompt && <p className="text-sm text-muted-foreground">{instance.template.journalPrompt}</p>}
            </div>
            <Textarea id="journal" value={journal} onChange={(event) => setJournal(event.target.value)} />
            {completionItems.some((item) => item.failureReason) && (
              <p className="text-xs text-muted-foreground">
                Incomplete reason: {completionItems.find((item) => item.failureReason)?.failureReason}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setIncompleteDialogOpen(true)} disabled={completionUpdatePending}>
                Mark as incomplete
              </Button>
              <Button type="button" size="sm" onClick={() => void saveProgress()} disabled={completionUpdatePending}>
                <Save className="h-4 w-4" />
                Save progress
              </Button>
            </div>
          </div>

          <Dialog
            open={incompleteDialogOpen}
            onClose={() => setIncompleteDialogOpen(false)}
            title="Incomplete reason"
            className="sm:max-w-md"
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void markIncomplete();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="incomplete-reason">Reason</Label>
                <Textarea
                  id="incomplete-reason"
                  value={incompleteReason}
                  onChange={(event) => setIncompleteReason(event.target.value)}
                  placeholder="Why is this block incomplete?"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setIncompleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={completionUpdatePending}>
                  <Save className="h-4 w-4" />
                  Save reason
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}
    </Dialog>
  );
}

function Checklist({
  title,
  items,
  onToggle
}: {
  title: string;
  items: Completion[];
  onToggle: (item: Completion, completed: boolean) => void;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} in this template.</p>}
        {items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-md bg-muted p-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={item.completed}
                onChange={(event) => onToggle(item, event.target.checked)}
              />
              <span className={item.completed ? "text-muted-foreground line-through" : ""}>{item.title}</span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
