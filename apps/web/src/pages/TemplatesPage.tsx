import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { TemplateCard } from "../components/templates/TemplateCard";
import { TemplateForm, type TemplateFormValues } from "../components/templates/TemplateForm";
import { LoadError } from "../components/ui/load-error";
import { useTemplates } from "../hooks/useTemplates";
import type { BlockTemplate } from "../types";

export function TemplatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlockTemplate | undefined>();
  const { data: templates = [], error, isError, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();

  const submit = (values: TemplateFormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      journalPrompt: values.journalPrompt || null,
      tasks: []
    };
    if (editing) {
      updateTemplate.mutate({ id: editing.id, payload }, { onSuccess: () => closeDialog() });
    } else {
      createTemplate.mutate(payload, { onSuccess: () => closeDialog() });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Reusable block templates</h2>
          <p className="text-sm text-muted-foreground">Templates define recurring habits, notes, and the journal prompt copied into daily instances.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading templates...</p>}
      {isError && <LoadError label="templates" error={error} />}
      {!isLoading && !isError && templates.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Create your first reusable routine block.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => {
              setEditing(template);
              setDialogOpen(true);
            }}
            onDelete={() => deleteTemplate.mutate(template.id)}
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onClose={closeDialog} title={editing ? "Edit template" : "Create template"}>
        <TemplateForm initial={editing} onSubmit={submit} submitting={createTemplate.isPending || updateTemplate.isPending} />
      </Dialog>
    </div>
  );
}
