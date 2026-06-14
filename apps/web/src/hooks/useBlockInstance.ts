import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { BlockInstance, Completion } from "../types";

type CompletionUpdate = {
  id: string;
  completed?: boolean;
  failureReason?: string | null;
};

type CompletionResponse = Completion & {
  instanceCompletionPercentage?: number;
};

type InstanceCompletionUpdate = {
  id: string;
  completed: boolean;
  failureReason?: string | null;
};

const getCompletionPercentage = (instance: BlockInstance) => {
  const items = [...instance.habitCompletions, ...instance.taskCompletions];
  const completed = items.filter((item) => item.completed).length;
  return items.length ? Math.round((completed / items.length) * 100) : 0;
};

export function useBlockInstance(scheduleBlockId?: string, date?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["block-instance", scheduleBlockId, date] as const;
  const dashboardKey = ["dashboard-instances", date] as const;

  const instance = useQuery({
    queryKey,
    enabled: Boolean(scheduleBlockId && date),
    queryFn: () => apiFetch<BlockInstance>(`/api/block-instances/${scheduleBlockId}?date=${date}`)
  });

  const updateCachedCompletion = (
    id: string,
    type: "habit" | "task",
    patch: { completed?: boolean; failureReason?: string | null },
    instanceCompletionPercentage?: number
  ) => {
    queryClient.setQueryData<BlockInstance>(queryKey, (current) => {
      if (!current) return current;

      const key = type === "habit" ? "habitCompletions" : "taskCompletions";
      const next = {
        ...current,
        [key]: current[key].map((item) => (item.id === id ? { ...item, ...patch } : item))
      };

      return {
        ...next,
        completionPercentage: instanceCompletionPercentage ?? getCompletionPercentage(next)
      };
    });

    queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
      current?.map((item) => {
        if (item.scheduleBlockId !== scheduleBlockId) return item;

        const key = type === "habit" ? "habitCompletions" : "taskCompletions";
        const next = {
          ...item,
          [key]: item[key].map((completion) => (completion.id === id ? { ...completion, ...patch } : completion))
        };

        return {
          ...next,
          completionPercentage: instanceCompletionPercentage ?? getCompletionPercentage(next)
        };
      })
    );
  };

  const updateHabit = useMutation({
    mutationFn: ({ id, completed, failureReason }: CompletionUpdate) =>
      apiFetch<CompletionResponse>(`/api/habit-completions/${id}`, { method: "PATCH", body: { completed, failureReason } }),
    onMutate: async ({ id, completed, failureReason }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });
      const previous = queryClient.getQueryData<BlockInstance>(queryKey);
      const previousDashboard = queryClient.getQueryData<BlockInstance[]>(dashboardKey);
      updateCachedCompletion(id, "habit", { completed, failureReason });
      return { previous, previousDashboard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousDashboard) queryClient.setQueryData(dashboardKey, context.previousDashboard);
    },
    onSuccess: (updated, { id }) => {
      updateCachedCompletion(
        id,
        "habit",
        { completed: updated.completed, failureReason: updated.failureReason },
        updated.instanceCompletionPercentage
      );
    }
  });

  const updateTask = useMutation({
    mutationFn: ({ id, completed, failureReason }: CompletionUpdate) =>
      apiFetch<CompletionResponse>(`/api/task-completions/${id}`, { method: "PATCH", body: { completed, failureReason } }),
    onMutate: async ({ id, completed, failureReason }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });
      const previous = queryClient.getQueryData<BlockInstance>(queryKey);
      const previousDashboard = queryClient.getQueryData<BlockInstance[]>(dashboardKey);
      updateCachedCompletion(id, "task", { completed, failureReason });
      return { previous, previousDashboard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousDashboard) queryClient.setQueryData(dashboardKey, context.previousDashboard);
    },
    onSuccess: (updated, { id }) => {
      updateCachedCompletion(
        id,
        "task",
        { completed: updated.completed, failureReason: updated.failureReason },
        updated.instanceCompletionPercentage
      );
    }
  });

  const updateJournal = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch(`/api/journal-entries/${id}`, { method: "PATCH", body: { content } }),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });
      const previous = queryClient.getQueryData<BlockInstance>(queryKey);
      const previousDashboard = queryClient.getQueryData<BlockInstance[]>(dashboardKey);
      queryClient.setQueryData<BlockInstance>(queryKey, (current) =>
        current ? { ...current, journalEntry: { ...current.journalEntry, id, content } } : current
      );
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) =>
          item.scheduleBlockId === scheduleBlockId ? { ...item, journalEntry: { ...item.journalEntry, id, content } } : item
        )
      );
      return { previous, previousDashboard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousDashboard) queryClient.setQueryData(dashboardKey, context.previousDashboard);
    }
  });

  const updateInstanceCompletion = useMutation({
    mutationFn: ({ id, completed, failureReason }: InstanceCompletionUpdate) =>
      apiFetch<{ instanceId: string; completionPercentage: number }>(`/api/block-instances/${id}/completions`, {
        method: "PATCH",
        body: { completed, failureReason }
      }),
    onMutate: async ({ completed, failureReason }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });
      const previous = queryClient.getQueryData<BlockInstance>(queryKey);
      const previousDashboard = queryClient.getQueryData<BlockInstance[]>(dashboardKey);
      queryClient.setQueryData<BlockInstance>(queryKey, (current) => {
        if (!current) return current;

        const patch = {
          completed,
          failureReason: completed ? null : failureReason ?? null
        };

        return {
          ...current,
          completionPercentage: completed ? 100 : 0,
          habitCompletions: current.habitCompletions.map((item) => ({ ...item, ...patch })),
          taskCompletions: current.taskCompletions.map((item) => ({ ...item, ...patch }))
        };
      });
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) => {
          if (item.scheduleBlockId !== scheduleBlockId) return item;

          const patch = {
            completed,
            failureReason: completed ? null : failureReason ?? null
          };

          return {
            ...item,
            completionPercentage: completed ? 100 : 0,
            habitCompletions: item.habitCompletions.map((completion) => ({ ...completion, ...patch })),
            taskCompletions: item.taskCompletions.map((completion) => ({ ...completion, ...patch }))
          };
        })
      );
      return { previous, previousDashboard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousDashboard) queryClient.setQueryData(dashboardKey, context.previousDashboard);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<BlockInstance>(queryKey, (current) =>
        current ? { ...current, completionPercentage: result.completionPercentage } : current
      );
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) =>
          item.id === result.instanceId ? { ...item, completionPercentage: result.completionPercentage } : item
        )
      );
    }
  });

  return { ...instance, updateHabit, updateTask, updateJournal, updateInstanceCompletion };
}
