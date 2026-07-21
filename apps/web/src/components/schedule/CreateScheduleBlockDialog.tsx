import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getDateForDayOfWeek, getDayOptions, getWeekStart, toDateKey } from "../../lib/date";
import { palette } from "../../lib/palette";
import { recurrenceOptions, type RecurrenceRule } from "../../lib/recurrence";
import { useScheduleBlocks } from "../../hooks/useScheduleBlocks";
import { useSchedules } from "../../hooks/useSchedules";
import { useTemplates } from "../../hooks/useTemplates";
import { useScheduleWindow } from "../../hooks/useScheduleWindow";
import { useWeekStartsOn } from "../../hooks/useWeekStartsOn";
import { useActiveDays } from "../../hooks/useActiveDays";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

const schema = z.object({
  templateId: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  recurrenceRule: z.enum(["YEARLY", "SEMI_ANNUALLY", "QUARTERLY", "MONTHLY", "WEEKLY", "DAILY", "WEEKDAYS", "CUSTOM", "ONCE"])
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
  const scheduleWindow = useScheduleWindow();
  const weekStartsOn = useWeekStartsOn();
  const activeDays = useActiveDays();
  const defaultDate = initialDate ?? new Date();
  const rawDefaultDay = defaultDate.getDay() === 0 ? 6 : defaultDate.getDay() - 1;
  const defaultDay = activeDays.includes(rawDefaultDay) ? rawDefaultDay : (activeDays[0] ?? rawDefaultDay);
  const dayOptions = getDayOptions(weekStartsOn, activeDays);
  const [mode, setMode] = useState<"template" | "temporary">("template");
  const [selectedDays, setSelectedDays] = useState<number[]>([defaultDay]);
  const [temporaryDate, setTemporaryDate] = useState(toDateKey(defaultDate));
  const [temporaryName, setTemporaryName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateId: templates[0]?.id ?? "",
      startTime: scheduleWindow.startTime,
      endTime: scheduleWindow.endTime,
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
    setSubmitError("");
    setSelectedDays([defaultDay]);
  }, [defaultDay, open]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((days) =>
      days.includes(dayIndex) ? days.filter((day) => day !== dayIndex) : [...days, dayIndex].sort((a, b) => a - b)
    );
  };

  const updateRecurrenceRule = (rule: RecurrenceRule) => {
    form.setValue("recurrenceRule", rule);

    if (rule === "DAILY") {
      setSelectedDays(activeDays);
    } else if (rule === "WEEKDAYS") {
      setSelectedDays(activeDays.filter((day) => day <= 4));
    } else if (selectedDays.length === 0) {
      setSelectedDays([defaultDay]);
    }
  };

  const resetDialog = () => {
    form.reset();
    setMode("template");
    setSelectedDays([defaultDay]);
    setTemporaryDate(toDateKey(defaultDate));
    setTemporaryName("");
    setSubmitError("");
  };

  const submit = async (values: FormValues) => {
    const usesSelectedDays = values.recurrenceRule === "WEEKLY" || values.recurrenceRule === "CUSTOM";

    if (mode === "template" && (!values.templateId || (usesSelectedDays && selectedDays.length === 0))) return;
    if (mode === "temporary" && !temporaryName.trim()) return;

    setSubmitError("");

    try {
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
                color: palette.gardenAfterRain,
                icon: "CalendarDays",
                category: "Temporary",
                journalPrompt: null,
                isTemporary: true,
                habits: [],
                tasks: []
              })
            ).id
          : values.templateId!;

      const recurrenceRule = mode === "temporary" ? "ONCE" : values.recurrenceRule;
      const weekStart = getWeekStart(defaultDate, weekStartsOn);
      const temporaryDateValue = new Date(`${temporaryDate}T00:00:00`);
      const temporaryDay = temporaryDateValue.getDay() === 0 ? 6 : temporaryDateValue.getDay() - 1;
      const daysToCreate =
        mode === "temporary" || ["DAILY", "WEEKDAYS", "MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "YEARLY"].includes(recurrenceRule)
          ? [mode === "temporary" ? temporaryDay : defaultDay]
          : selectedDays;

      await createBlocks.mutateAsync(
        daysToCreate.map((dayOfWeek) => {
          const anchorDate = mode === "temporary" ? temporaryDate : toDateKey(getDateForDayOfWeek(weekStart, dayOfWeek, weekStartsOn));

          return {
            scheduleId,
            templateId,
            dayOfWeek,
            startTime: values.startTime,
            endTime: values.endTime,
            recurrenceRule,
            date: anchorDate
          };
        })
      );

      resetDialog();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "Could not create this block.");
    }
  };

  const watchedRecurrenceRule = form.watch("recurrenceRule");
  const showsDayPicker = watchedRecurrenceRule === "WEEKLY" || watchedRecurrenceRule === "CUSTOM";

  return (
    <Dialog open={open} onClose={onClose} title="Add block">
      {templates.length === 0 && mode === "template" ? (
        <p className="text-sm text-muted-foreground">Create a block template first, or switch to a temporary block.</p>
      ) : null}

      <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeButton
            active={mode === "template"}
            title="Select from template"
            description="Use an existing repeatable routine."
            onClick={() => {
              setMode("template");
              if (form.getValues("recurrenceRule") === "ONCE") {
                form.setValue("recurrenceRule", "WEEKLY");
              }
            }}
          />
          <ModeButton
            active={mode === "temporary"}
            title="Create temporary block"
            description="A one-time block. Add tasks after opening it."
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
          <div className="space-y-4 rounded-lg border bg-muted p-4">
            <div className="space-y-2">
              <Label htmlFor="temporaryName">Temporary block name</Label>
              <Input id="temporaryName" value={temporaryName} onChange={(event) => setTemporaryName(event.target.value)} placeholder="Doctor appointment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temporaryDate">Date</Label>
              <Input id="temporaryDate" type="date" value={temporaryDate} onChange={(event) => setTemporaryDate(event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Tasks are added after you click this block in the schedule or dashboard.</p>
          </div>
        )}

        <div className="space-y-3 rounded-lg border bg-muted p-4">
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
          <div className="space-y-3 rounded-lg border bg-muted p-4">
            {showsDayPicker && (
              <div className="space-y-2">
                <Label>Day or days</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dayOptions.map(({ label, dayOfWeek }) => (
                    <label key={label} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={selectedDays.includes(dayOfWeek)} onChange={() => toggleDay(dayOfWeek)} />
                      {label}
                    </label>
                  ))}
                </div>
                {selectedDays.length === 0 && <p className="text-sm text-destructive">Choose at least one day.</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">Repeats</Label>
              <Select
                id="recurrenceRule"
                value={watchedRecurrenceRule}
                onChange={(event) => updateRecurrenceRule(event.target.value as RecurrenceRule)}
              >
                {recurrenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted p-4">
            <h3 className="font-semibold">Repeat</h3>
            <p className="text-sm text-muted-foreground">Temporary blocks happen once on {temporaryDate}.</p>
          </div>
        )}

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button
          type="submit"
          disabled={
            createBlocks.isPending ||
            createSchedule.isPending ||
            createTemplate.isPending ||
            (mode === "template" &&
              (!form.watch("templateId") ||
                (showsDayPicker && selectedDays.length === 0))) ||
            (mode === "temporary" && !temporaryName.trim())
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
      className={`rounded-md border px-4 py-3 text-left transition ${active ? "border-primary bg-palette-mint text-primary" : "bg-background hover:bg-muted"}`}
      onClick={onClick}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </button>
  );
}
