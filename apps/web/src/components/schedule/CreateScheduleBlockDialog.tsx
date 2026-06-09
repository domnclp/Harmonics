import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDays, dayLabels, getMonday, toDateKey } from "../../lib/date";
import { useScheduleBlocks } from "../../hooks/useScheduleBlocks";
import { useSchedules } from "../../hooks/useSchedules";
import { useTemplates } from "../../hooks/useTemplates";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

const schema = z.object({
  templateId: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  recurrenceRule: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export function CreateScheduleBlockDialog({
  open,
  onClose,
  initialDate
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: Date;
}) {
  const { data: schedules = [], createSchedule } = useSchedules();
  const { createBlocks } = useScheduleBlocks();
  const { data: templates = [], createTemplate } = useTemplates();
  const defaultDate = initialDate ?? new Date();
  const defaultDay = defaultDate.getDay() === 0 ? 6 : defaultDate.getDay() - 1;
  const [mode, setMode] = useState<"template" | "temporary">("template");
  const [selectedDays, setSelectedDays] = useState<number[]>([defaultDay]);
  const [temporaryDate, setTemporaryDate] = useState(toDateKey(defaultDate));
  const [temporaryName, setTemporaryName] = useState("");
  const [temporaryTasks, setTemporaryTasks] = useState<string[]>([""]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateId: templates[0]?.id ?? "",
      startTime: "06:30",
      endTime: "07:00",
      recurrenceRule: "WEEKLY"
    }
  });

  useEffect(() => {
    if (templates[0]?.id && !form.getValues("templateId")) {
      form.setValue("templateId", templates[0].id);
    }
  }, [form, templates]);

  useEffect(() => {
    if (!open) return;
    setSelectedDays([defaultDay]);
  }, [defaultDay, open]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((days) =>
      days.includes(dayIndex) ? days.filter((day) => day !== dayIndex) : [...days, dayIndex].sort((a, b) => a - b)
    );
  };

  const resetDialog = () => {
    form.reset();
    setMode("template");
    setSelectedDays([defaultDay]);
    setTemporaryDate(toDateKey(defaultDate));
    setTemporaryName("");
    setTemporaryTasks([""]);
  };

  const addTemporaryTask = () => {
    setTemporaryTasks((tasks) => [...tasks, ""]);
  };

  const updateTemporaryTask = (index: number, value: string) => {
    setTemporaryTasks((tasks) => tasks.map((task, taskIndex) => (taskIndex === index ? value : task)));
  };

  const removeTemporaryTask = (index: number) => {
    setTemporaryTasks((tasks) => {
      const nextTasks = tasks.filter((_, taskIndex) => taskIndex !== index);
      return nextTasks.length > 0 ? nextTasks : [""];
    });
  };

  const submit = async (values: FormValues) => {
    const cleanTemporaryTasks = temporaryTasks.map((task) => task.trim()).filter(Boolean);

    if (mode === "template" && (!values.templateId || selectedDays.length === 0)) return;
    if (mode === "temporary" && (!temporaryName.trim() || cleanTemporaryTasks.length === 0)) return;

    let scheduleId = schedules[0]?.id;
    if (!scheduleId) {
      const schedule = await createSchedule.mutateAsync("Main Schedule");
      scheduleId = schedule.id;
    }

    const templateId =
      mode === "temporary"
        ? (
            await createTemplate.mutateAsync({
              name: temporaryName.trim(),
              description: "One-time block",
              color: "#7d6b55",
              icon: "CalendarDays",
              category: "Temporary",
              journalPrompt: null,
              isTemporary: true,
              habits: [],
              tasks: cleanTemporaryTasks.map((title, sortOrder) => ({ title, sortOrder }))
            })
          ).id
        : values.templateId!;

    const monday = getMonday(defaultDate);
    const temporaryDateValue = new Date(`${temporaryDate}T00:00:00`);
    const temporaryDay = temporaryDateValue.getDay() === 0 ? 6 : temporaryDateValue.getDay() - 1;
    const daysToCreate = mode === "temporary" ? [temporaryDay] : selectedDays;

    await createBlocks.mutateAsync(
      daysToCreate.map((dayOfWeek) => ({
          scheduleId,
          templateId,
          dayOfWeek,
          startTime: values.startTime,
          endTime: values.endTime,
          recurrenceRule: mode === "temporary" ? "ONCE" : values.recurrenceRule,
          date: mode === "temporary" ? temporaryDate : values.recurrenceRule === "ONCE" ? toDateKey(addDays(monday, dayOfWeek)) : null
        }))
    );

    resetDialog();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add block">
      {templates.length === 0 && mode === "template" ? (
        <p className="text-sm text-muted-foreground">Create a block template first, or switch to a temporary block.</p>
      ) : null}

      <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeButton active={mode === "template"} title="Select from template" description="Use an existing repeatable routine." onClick={() => setMode("template")} />
          <ModeButton
            active={mode === "temporary"}
            title="Create temporary block"
            description="A one-time event with tasks only."
            onClick={() => {
              setMode("temporary");
              form.setValue("recurrenceRule", "ONCE");
            }}
          />
        </div>

        {mode === "template" ? (
          <div className="space-y-2">
            <Label htmlFor="templateId">Template</Label>
            <Select id="templateId" {...form.register("templateId")}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border bg-muted/25 p-4">
            <div className="space-y-2">
              <Label htmlFor="temporaryName">Temporary block name</Label>
              <Input id="temporaryName" value={temporaryName} onChange={(event) => setTemporaryName(event.target.value)} placeholder="Doctor appointment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temporaryDate">Date</Label>
              <Input id="temporaryDate" type="date" value={temporaryDate} onChange={(event) => setTemporaryDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Tasks</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTemporaryTask}>
                  <Plus className="h-4 w-4" />
                  Add task
                </Button>
              </div>
              <div className="space-y-2">
                {temporaryTasks.map((task, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      aria-label={`Temporary task ${index + 1}`}
                      value={task}
                      onChange={(event) => updateTemporaryTask(index, event.target.value)}
                      placeholder={index === 0 ? "Bring documents" : "Add another task"}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTemporaryTask(index)} aria-label="Remove task">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {temporaryTasks.every((task) => !task.trim()) && <p className="text-sm text-destructive">Add at least one task.</p>}
              <p className="text-xs text-muted-foreground">Temporary blocks use tasks only, so there are no habits to set up.</p>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-lg border bg-muted/25 p-4">
          <div>
            <h3 className="font-semibold">Time</h3>
            <p className="text-sm text-muted-foreground">Choose when this block starts and ends.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" type="time" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input id="endTime" type="time" {...form.register("endTime")} />
            </div>
          </div>
        </div>

        {mode === "template" ? (
          <div className="space-y-3 rounded-lg border bg-muted/25 p-4">
            <div>
              <h3 className="font-semibold">Repeat</h3>
              <p className="text-sm text-muted-foreground">Pick the day or days and how the block should repeat.</p>
            </div>
            <div className="space-y-2">
              <Label>Day or days</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {dayLabels.map((day, index) => (
                  <label key={day} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={selectedDays.includes(index)} onChange={() => toggleDay(index)} />
                    {day}
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && <p className="text-sm text-destructive">Choose at least one day.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">Repeats</Label>
              <Select id="recurrenceRule" {...form.register("recurrenceRule")}>
                <option value="WEEKLY">Every week</option>
                <option value="MONTHLY">Every month</option>
                <option value="CUSTOM">Custom</option>
                <option value="ONCE">Does not repeat</option>
              </Select>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/25 p-4">
            <h3 className="font-semibold">Repeat</h3>
            <p className="text-sm text-muted-foreground">Temporary blocks happen once on {temporaryDate}.</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={
            createBlocks.isPending ||
            createSchedule.isPending ||
            createTemplate.isPending ||
            (mode === "template" && (!form.watch("templateId") || selectedDays.length === 0)) ||
            (mode === "temporary" && (!temporaryName.trim() || temporaryTasks.every((task) => !task.trim())))
          }
        >
          <CalendarPlus className="h-4 w-4" />
          Add block
        </Button>
      </form>
    </Dialog>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-4 py-3 text-left transition ${active ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
      onClick={onClick}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </button>
  );
}
