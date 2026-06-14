import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ScheduleBlock } from "../types";

export type ScheduleBlockPayload = {
  scheduleId: string;
  templateId: string;
  dayOfWeek: number;
  date?: string | null;
  startTime: string;
  endTime: string;
  recurrenceRule?: string;
};

export function useScheduleBlocks() {
  const queryClient = useQueryClient();
  const blocks = useQuery({
    queryKey: ["schedule-blocks"],
    queryFn: () => apiFetch<ScheduleBlock[]>("/api/schedule-blocks")
  });

  const createBlock = useMutation({
    mutationFn: (payload: ScheduleBlockPayload) =>
      apiFetch<ScheduleBlock>("/api/schedule-blocks", { method: "POST", body: payload }),
    onSuccess: (created) => {
      queryClient.setQueryData<ScheduleBlock[]>(["schedule-blocks"], (blocks = []) => [...blocks, created]);
    }
  });

  const createBlocks = useMutation({
    mutationFn: (payload: ScheduleBlockPayload[]) =>
      apiFetch<ScheduleBlock[]>("/api/schedule-blocks/batch", { method: "POST", body: payload }),
    onSuccess: (created) => {
      queryClient.setQueryData<ScheduleBlock[]>(["schedule-blocks"], (blocks = []) => [...blocks, ...created]);
    }
  });

  const updateBlock = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ScheduleBlockPayload> }) =>
      apiFetch<ScheduleBlock>(`/api/schedule-blocks/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-instances"] });
      queryClient.invalidateQueries({ queryKey: ["block-instance"] });
    }
  });

  const deleteBlock = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/schedule-blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-instances"] });
      queryClient.invalidateQueries({ queryKey: ["block-instance"] });
    }
  });

  return { ...blocks, createBlock, createBlocks, updateBlock, deleteBlock };
}
