import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "../lib/api";
import type { BlockTemplate } from "../types";

export type TemplatePayload = {
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  category: string;
  journalPrompt?: string | null;
  isTemporary?: boolean;
  habits: { title: string; sortOrder: number }[];
  // Optional: the template form no longer edits tasks, and omitting the field
  // tells the API to leave existing template tasks alone.
  tasks?: { title: string; sortOrder: number }[];
};

export function useTemplates() {
  const queryClient = useQueryClient();
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiFetch<BlockTemplate[]>("/api/templates")
  });

  // Templates arrive newest-first, which suits the Templates page but makes the
  // block dropdowns hard to scan. Exposed separately so picking a template is
  // alphabetical everywhere without reordering that page.
  const sortedTemplates = useMemo(
    () => [...(templates.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [templates.data]
  );

  const createTemplate = useMutation({
    mutationFn: (payload: TemplatePayload) => apiFetch<BlockTemplate>("/api/templates", { method: "POST", body: payload }),
    onSuccess: (created) => {
      if (created.isTemporary) return;
      queryClient.setQueryData<BlockTemplate[]>(["templates"], (templates = []) => [created, ...templates]);
    }
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TemplatePayload> }) =>
      apiFetch<BlockTemplate>(`/api/templates/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] })
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/templates/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["templates"] });
      const previous = queryClient.getQueryData<BlockTemplate[]>(["templates"]);
      queryClient.setQueryData<BlockTemplate[]>(["templates"], (templates = []) => templates.filter((template) => template.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["templates"], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-instances"] });
    }
  });

  return { ...templates, sortedTemplates, createTemplate, updateTemplate, deleteTemplate };
}
