import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import type { BlockTemplate } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";

const itemSchema = z.object({ title: z.string().min(1), sortOrder: z.number() });

const templateFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().min(1),
  icon: z.string().min(1),
  category: z.string().min(1),
  journalPrompt: z.string().optional(),
  habits: z.array(itemSchema),
  tasks: z.array(itemSchema)
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

const colors = ["#8f2633", "#6f8f72", "#7d6b55", "#3f3a37", "#b85c38", "#4f6f8f"];

export function TemplateForm({
  initial,
  onSubmit,
  submitting
}: {
  initial?: BlockTemplate;
  onSubmit: (values: TemplateFormValues) => void;
  submitting?: boolean;
}) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      color: initial?.color ?? colors[0],
      icon: initial?.icon ?? "Sunrise",
      category: initial?.category ?? "Routine",
      journalPrompt: initial?.journalPrompt ?? "",
      habits: initial?.habits.map((habit, index) => ({ title: habit.title, sortOrder: index })) ?? [{ title: "", sortOrder: 0 }],
      tasks: initial?.tasks.map((task, index) => ({ title: task.title, sortOrder: index })) ?? []
    }
  });

  const habits = useFieldArray({ control: form.control, name: "habits" });
  const tasks = useFieldArray({ control: form.control, name: "tasks" });

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Morning Routine" {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" placeholder="Routine" {...form.register("category")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Select id="icon" {...form.register("icon")}>
            <option>Sunrise</option>
            <option>Dumbbell</option>
            <option>BookOpen</option>
            <option>Brain</option>
            <option>Coffee</option>
            <option>Moon</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                className="h-10 w-10 rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: color, borderColor: form.watch("color") === color ? "white" : color }}
                onClick={() => form.setValue("color", color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="What this block is for." {...form.register("description")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ItemEditor title="Habits" fields={habits.fields} register={form.register} append={() => habits.append({ title: "", sortOrder: habits.fields.length })} remove={habits.remove} name="habits" />
        <ItemEditor title="Tasks" fields={tasks.fields} register={form.register} append={() => tasks.append({ title: "", sortOrder: tasks.fields.length })} remove={tasks.remove} name="tasks" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="journalPrompt">Default journal prompt</Label>
        <Textarea id="journalPrompt" placeholder="How did this block go?" {...form.register("journalPrompt")} />
      </div>

      <Button type="submit" disabled={submitting}>
        <Save className="h-4 w-4" />
        Save template
      </Button>
    </form>
  );
}

function ItemEditor({
  title,
  fields,
  register,
  append,
  remove,
  name
}: {
  title: string;
  fields: { id: string }[];
  register: ReturnType<typeof useForm<TemplateFormValues>>["register"];
  append: () => void;
  remove: (index: number) => void;
  name: "habits" | "tasks";
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={append}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input placeholder={`${title.slice(0, -1)} title`} {...register(`${name}.${index}.title`)} />
            <input type="hidden" {...register(`${name}.${index}.sortOrder`, { valueAsNumber: true })} value={index} readOnly />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove ${title.slice(0, -1).toLowerCase()}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
