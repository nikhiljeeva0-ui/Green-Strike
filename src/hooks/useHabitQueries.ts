import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createHabit,
  deleteHabitAndCompletions,
  fetchHabitCompletions,
  fetchHabits,
  setHabitArchived,
  toggleHabitCompletion,
  updateHabit,
} from '../lib/db';
import { completionsCacheKey } from '../lib/dbOps';
import type { DateKey } from '../lib/dates';
import type { Habit, HabitDraft } from '../lib/types';
import { useToast } from '../contexts/ToastContext';

export function useHabits(userId: string | undefined) {
  return useQuery({
    queryKey: ['habits', userId],
    queryFn: () => fetchHabits(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useCompletions(userId: string | undefined, habitId: string | undefined) {
  return useQuery({
    queryKey: habitId ? completionsCacheKey(habitId) : (['completions', undefined] as const),
    queryFn: () => fetchHabitCompletions(userId!, habitId!),
    enabled: Boolean(userId && habitId),
    staleTime: 60_000,
  });
}

export function useToggleCompletion(userId: string | undefined, today: DateKey) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  return useMutation({
    mutationFn: async ({
      habitId,
      date,
      nextValue,
    }: {
      habitId: string;
      date: DateKey;
      nextValue: boolean;
    }) => {
      if (!userId) throw new Error('Not signed in.');
      const lockKey = `${habitId}:${date}`;
      if (inFlightKeysRef.current.has(lockKey)) {
        return;
      }
      inFlightKeysRef.current.add(lockKey);
      try {
        await toggleHabitCompletion(userId, habitId, date, nextValue, today);
      } finally {
        inFlightKeysRef.current.delete(lockKey);
      }
    },
    onMutate: async ({ habitId, date, nextValue }) => {
      const lockKey = `${habitId}:${date}`;
      if (inFlightKeysRef.current.has(lockKey)) {
        return { skipped: true, habitId };
      }
      const key = completionsCacheKey(habitId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Set<DateKey>>(key);
      const next = new Set(previous ?? []);
      if (nextValue) {
        next.add(date);
      } else {
        next.delete(date);
      }
      queryClient.setQueryData(key, next);
      return { skipped: false, previous, habitId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx && !ctx.skipped && ctx.previous) {
        queryClient.setQueryData(completionsCacheKey(ctx.habitId), ctx.previous);
      }
      showToast(
        err instanceof Error ? err.message : 'Could not update completion.',
        'error'
      );
      if (ctx) {
        void queryClient.invalidateQueries({ queryKey: completionsCacheKey(ctx.habitId) });
      }
    },
    onSuccess: (_data, vars, ctx) => {
      // Optimistic cache update already matches Firestore write; only refetch if cache had no snapshot.
      if (ctx && !ctx.skipped && ctx.previous === undefined) {
        void queryClient.invalidateQueries({ queryKey: completionsCacheKey(vars.habitId) });
      }
    },
  });
}

export function useCreateHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (draft: HabitDraft) => {
      if (!userId) throw new Error('Not signed in.');
      return createHabit(userId, draft);
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Habit[]>(['habits', userId], (prev) =>
        prev ? [...prev, created] : [created]
      );
      void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      showToast(`Created "${created.name}".`, 'success');
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Failed to create habit.',
        'error'
      );
    },
  });
}

export function useUpdateHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ habitId, draft }: { habitId: string; draft: HabitDraft }) => {
      if (!userId) throw new Error('Not signed in.');
      await updateHabit(userId, habitId, draft);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      showToast('Habit updated.', 'success');
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Failed to update habit.',
        'error'
      );
    },
  });
}

export function useArchiveHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ habitId, archive }: { habitId: string; archive: boolean }) => {
      if (!userId) throw new Error('Not signed in.');
      await setHabitArchived(userId, habitId, archive);
      return archive;
    },
    onSuccess: (archive) => {
      void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      showToast(archive ? 'Habit archived.' : 'Habit restored.', 'success');
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Failed to update archive status.',
        'error'
      );
    },
  });
}

export function useDeleteHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (habitId: string) => {
      if (!userId) throw new Error('Not signed in.');
      await deleteHabitAndCompletions(userId, habitId);
      return habitId;
    },
    onSuccess: (habitId) => {
      queryClient.removeQueries({ queryKey: ['completions', habitId] });
      void queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      showToast('Habit deleted.', 'success');
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Failed to delete habit.',
        'error'
      );
    },
  });
}
