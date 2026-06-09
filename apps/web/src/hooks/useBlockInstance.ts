import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { BlockInstance, Completion } from "../types";

export function useBlockInstance(scheduleBlockId?: string, date?: string) {
  const queryClient = useQueryClient();

  const instance = useQuery({
    queryKey: ["block-instance", scheduleBlockId, date],
    enabled: Boolean(scheduleBlockId && date),
    queryFn: () => apiFetch<BlockInstance>(`/api/block-instances/${scheduleBlockId}?date=${date}`)
  });

  const updateHabit = useMutation({
    mutationFn: ({ id, completed, failureReason }: { id: string; completed?: boolean; failureReason?: string | null }) =>
      apiFetch<Completion>(`/api/habit-completions/${id}`, { method: "PATCH", body: { completed, failureReason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["block-instance", scheduleBlockId, date] })
  });

  const updateTask = useMutation({
    mutationFn: ({ id, completed, failureReason }: { id: string; completed?: boolean; failureReason?: string | null }) =>
      apiFetch<Completion>(`/api/task-completions/${id}`, { method: "PATCH", body: { completed, failureReason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["block-instance", scheduleBlockId, date] })
  });

  const updateJournal = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch(`/api/journal-entries/${id}`, { method: "PATCH", body: { content } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["block-instance", scheduleBlockId, date] })
  });

  return { ...instance, updateHabit, updateTask, updateJournal };
}
