import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import type { BlockTemplate } from "../../types";
import { palette, templateColors } from "../../lib/palette";
import { Button } from "../ui/button";
import { IconPicker } from "./IconPicker";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const itemSchema = z.object({ title: z.string().min(1), sortOrder: z.number() });

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Choose a color");

const templateFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: colorSchema,
  icon: z.string().min(1),
  category: z.string().min(1),
  journalPrompt: z.string().optional(),
  habits: z.array(itemSchema)
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

const toOrderedItems = (items: { title: string }[] | undefined) =>
  items?.map((item, index) => ({ title: item.title, sortOrder: index })) ?? [{ title: "", sortOrder: 0 }];

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
      color: initial?.color ?? templateColors[0],
      icon: initial?.icon ?? "Sunrise",
      category: initial?.category ?? "",
      journalPrompt: initial?.journalPrompt ?? "",
      habits: toOrderedItems(initial?.habits)
    }
  });

  // Tasks are deliberately absent: they are added per-day from the schedule or
  // dashboard, not defined on the template. Omitting the field from the payload
  // leaves any existing template tasks untouched, because templateService.update
  // only rewrites tasks when input.tasks is present.
  const habits = useFieldArray({ control: form.control, name: "habits" });

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter a template name" {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" placeholder="Enter a category" {...form.register("category")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <IconPicker value={form.watch("icon")} onChange={(icon) => form.setValue("icon", icon)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-color">Color</Label>
          <div className="flex flex-wrap gap-2">
            {templateColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                className="h-10 w-10 rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: color, borderColor: form.watch("color") === color ? palette.lemonWaterIced : color }}
                onClick={() => form.setValue("color", color)}
              />
            ))}
            <label
              className="relative grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-md border-2 bg-card text-xs font-semibold text-muted-foreground focus-within:ring-2 focus-within:ring-ring"
              style={{
                backgroundColor: templateColors.includes(form.watch("color")) ? palette.cloudyAfternoon : form.watch("color"),
                borderColor: templateColors.includes(form.watch("color")) ? palette.seaGlassShelf : palette.lemonWaterIced
              }}
              title="Choose custom color"
            >
              <span>+</span>
              <input id="custom-color" type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" {...form.register("color")} />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="What this block is for." {...form.register("description")} />
      </div>

      <ItemEditor
        title="Habits"
        name="habits"
        fields={habits.fields}
        register={form.register}
        append={() => habits.append({ title: "", sortOrder: habits.fields.length })}
        remove={habits.remove}
        move={habits.move}
      />

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
  name,
  fields,
  register,
  append,
  remove,
  move
}: {
  title: string;
  name: "habits";
  fields: { id: string }[];
  register: UseFormRegister<TemplateFormValues>;
  append: () => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from === -1 || to === -1) return;

    move(from, to);
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={append}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <SortableItem key={field.id} id={field.id}>
                <Input placeholder={`${title.slice(0, -1)} title`} {...register(`${name}.${index}.title`)} />
                <input type="hidden" {...register(`${name}.${index}.sortOrder`, { valueAsNumber: true })} value={index} readOnly />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove ${title.slice(0, -1).toLowerCase()}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="grid h-10 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
