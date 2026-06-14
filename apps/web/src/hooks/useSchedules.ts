import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Schedule } from "../types";

export function useSchedules() {
  const queryClient = useQueryClient();
  const schedules = useQuery({
    queryKey: ["schedules"],
    queryFn: () => apiFetch<Schedule[]>("/api/schedules")
  });

  const createSchedule = useMutation({
    mutationFn: (name: string) => apiFetch<Schedule>("/api/schedules", { method: "POST", body: { name } }),
    onSuccess: (created) => {
      queryClient.setQueryData<Schedule[]>(["schedules"], (schedules = []) => [...schedules, created]);
    }
  });

  return { ...schedules, createSchedule };
}
