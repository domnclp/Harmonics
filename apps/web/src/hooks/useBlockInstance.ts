import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

type TaskCreateResponse = CompletionResponse;

type TaskDeleteResponse = {
  id: string;
  instanceId: string;
  completionPercentage: number;
};

type TaskMoveResponse = {
  id: string;
  instanceId: string;
  // The day the task left, plus its recalculated percentage.
  sourceInstanceId?: string;
  sourceCompletionPercentage?: number;
  instanceCompletionPercentage?: number;
};

type InstanceCompletionUpdate = {
  id: string;
  completed: boolean;
  failureReason?: string | null;
  journalContent?: string;
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

  useEffect(() => {
    if (!date || !instance.data) return;

    const loadedInstance = instance.data;

    queryClient.setQueryData<BlockInstance[]>(["dashboard-instances", date], (current) => {
      if (!current) return [loadedInstance];

      const exists = current.some((item) => item.id === loadedInstance.id);
      if (exists) {
        return current.map((item) => (item.id === loadedInstance.id ? loadedInstance : item));
      }

      return [...current, loadedInstance].sort((left, right) => left.startTime.localeCompare(right.startTime));
    });
  }, [date, instance.data, queryClient]);

  const updateCachedCompletion = (
    id: string,
    type: "habit" | "task",
    patch: Partial<Completion>,
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
        { completed: updated.completed, failureReason: updated.failureReason, streak: updated.streak },
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

  const createTask = useMutation({
    mutationFn: ({ instanceId, title }: { instanceId: string; title: string }) =>
      apiFetch<TaskCreateResponse>(`/api/block-instances/${instanceId}/task-completions`, { method: "POST", body: { title } }),
    onSuccess: (created) => {
      queryClient.setQueryData<BlockInstance>(queryKey, (current) =>
        current
          ? {
              ...current,
              completionPercentage: created.instanceCompletionPercentage ?? getCompletionPercentage({ ...current, taskCompletions: [...current.taskCompletions, created] }),
              taskCompletions: [...current.taskCompletions, created]
            }
          : current
      );
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) =>
          item.scheduleBlockId === scheduleBlockId
            ? {
                ...item,
                completionPercentage:
                  created.instanceCompletionPercentage ?? getCompletionPercentage({ ...item, taskCompletions: [...item.taskCompletions, created] }),
                taskCompletions: [...item.taskCompletions, created]
              }
            : item
        )
      );
    }
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiFetch<TaskDeleteResponse>(`/api/task-completions/${id}`, { method: "DELETE" }),
    onSuccess: (result) => {
      queryClient.setQueryData<BlockInstance>(queryKey, (current) =>
        current
          ? {
              ...current,
              completionPercentage: result.completionPercentage,
              taskCompletions: current.taskCompletions.filter((item) => item.id !== result.id)
            }
          : current
      );
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) =>
          item.id === result.instanceId
            ? {
                ...item,
                completionPercentage: result.completionPercentage,
                taskCompletions: item.taskCompletions.filter((completion) => completion.id !== result.id)
              }
            : item
        )
      );
    }
  });

  const moveTask = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      apiFetch<TaskMoveResponse>(`/api/task-completions/${id}/move`, { method: "PATCH", body: { date } }),
    onSuccess: (result) => {
      // The task now belongs to another day, so drop it from the day in view and
      // apply the recalculated percentage the server sent back for it.
      queryClient.setQueryData<BlockInstance>(queryKey, (current) =>
        current && result.sourceInstanceId === current.id
          ? {
              ...current,
              completionPercentage: result.sourceCompletionPercentage ?? current.completionPercentage,
              taskCompletions: current.taskCompletions.filter((item) => item.id !== result.id)
            }
          : current
      );
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) =>
          item.id === result.sourceInstanceId
            ? {
                ...item,
                completionPercentage: result.sourceCompletionPercentage ?? item.completionPercentage,
                taskCompletions: item.taskCompletions.filter((completion) => completion.id !== result.id)
              }
            : item
        )
      );
      // The destination day may not be cached (or may have just been
      // materialized), so let it refetch rather than guessing its shape.
      queryClient.invalidateQueries({ queryKey: ["block-instance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-instances"] });
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
    mutationFn: ({ id, completed, failureReason, journalContent }: InstanceCompletionUpdate) =>
      apiFetch<{ instanceId: string; completionPercentage: number }>(`/api/block-instances/${id}/completions`, {
        method: "PATCH",
        body: { completed, failureReason, journalContent }
      }),
    onMutate: async ({ completed, failureReason, journalContent }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });
      const previous = queryClient.getQueryData<BlockInstance>(queryKey);
      const previousDashboard = queryClient.getQueryData<BlockInstance[]>(dashboardKey);
      queryClient.setQueryData<BlockInstance>(queryKey, (current) => {
        if (!current) return current;

        if (completed) {
          return {
            ...current,
            completionPercentage: getCompletionPercentage(current),
            journalEntry: journalContent === undefined ? current.journalEntry : { ...current.journalEntry, content: journalContent }
          };
        }

        const patch = {
          completed: false,
          failureReason: failureReason ?? null
        };

        return {
          ...current,
          completionPercentage: 0,
          journalEntry: journalContent === undefined ? current.journalEntry : { ...current.journalEntry, content: journalContent },
          habitCompletions: current.habitCompletions.map((item) => ({ ...item, ...patch })),
          taskCompletions: current.taskCompletions.map((item) => ({ ...item, ...patch }))
        };
      });
      queryClient.setQueryData<BlockInstance[]>(dashboardKey, (current) =>
        current?.map((item) => {
          if (item.scheduleBlockId !== scheduleBlockId) return item;

          if (completed) {
            return {
              ...item,
              completionPercentage: getCompletionPercentage(item),
              journalEntry: journalContent === undefined ? item.journalEntry : { ...item.journalEntry, content: journalContent }
            };
          }

          const patch = {
            completed: false,
            failureReason: failureReason ?? null
          };

          return {
            ...item,
            completionPercentage: 0,
            journalEntry: journalContent === undefined ? item.journalEntry : { ...item.journalEntry, content: journalContent },
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

  return { ...instance, updateHabit, updateTask, createTask, deleteTask, moveTask, updateJournal, updateInstanceCompletion };
}
