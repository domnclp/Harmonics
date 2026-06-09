import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useAnalytics(weekStart: string) {
  const weekly = useQuery({
    queryKey: ["analytics", "weekly", weekStart],
    queryFn: () =>
      apiFetch<{
        overall: number;
        daily: { date: string; completion: number }[];
        completedHabits: number;
        completedTasks: number;
        totalBlocks: number;
      }>(`/api/analytics/weekly?weekStart=${weekStart}`)
  });

  const templates = useQuery({
    queryKey: ["analytics", "templates"],
    queryFn: () =>
      apiFetch<{
        templates: { templateId: string; name: string; completion: number; total: number }[];
        mostCompleted: { name: string; completion: number } | null;
        leastCompleted: { name: string; completion: number } | null;
      }>("/api/analytics/templates")
  });

  const failureReasons = useQuery({
    queryKey: ["analytics", "failure-reasons"],
    queryFn: () =>
      apiFetch<{
        reasons: { name: string; value: number }[];
        skippedItems: { title: string; count: number }[];
      }>("/api/analytics/failure-reasons")
  });

  return { weekly, templates, failureReasons };
}
