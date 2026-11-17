import { isValidDateKey, type DateKey } from './dates';
import type { Habit } from './types';

const HABIT_REMINDER_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const MAX_ACTIVE_HABITS = 30;
export const COMPLETION_PAGE_SIZE = 500;
export const DELETE_BATCH_SIZE = 400;

export function completionsCacheKey(
  habitId: string,
  userId?: string
): readonly ['completions', string, string] {
  return ['completions', userId ?? 'anon', habitId] as const;
}

export function normalizeReminderTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!HABIT_REMINDER_REGEX.test(trimmed)) {
    throw new Error('Reminder time must be in HH:MM format.');
  }
  return trimmed;
}

type CompletionPageItem = {
  id: string;
  completionDate?: unknown;
};

type CompletionPageResult<TCursor> = {
  items: CompletionPageItem[];
  lastCursor: TCursor | null;
};

/**
 * Fetches all completions for a single habit across explicit cursor pages
 * of `pageSize` (500) so histories >1,000 entries load without truncation.
 */
export async function fetchAllCompletionDatesPaginated<TCursor>(
  fetchPage: (cursor: TCursor | null, pageSize: number) => Promise<CompletionPageResult<TCursor>>,
  pageSize: number = COMPLETION_PAGE_SIZE
): Promise<Set<DateKey>> {
  const dates = new Set<DateKey>();
  let cursor: TCursor | null = null;

  while (true) {
    const page = await fetchPage(cursor, pageSize);
    for (const item of page.items) {
      const dateStr = String(item.completionDate || item.id);
      if (isValidDateKey(dateStr)) {
        dates.add(dateStr);
      }
    }
    if (page.items.length < pageSize || !page.lastCursor) {
      break;
    }
    cursor = page.lastCursor;
  }

  return dates;
}

type HabitDeletionStore = {
  fetchCompletionIdsBatch: (batchLimit: number) => Promise<string[]>;
  deleteCompletionIdsBatch: (ids: string[]) => Promise<void>;
  deleteHabitDoc: () => Promise<void>;
};

/**
 * Deletes every document in the completions subcollection in batches of at most
 * 400 before deleting the parent habit document, leaving no orphaned docs.
 */
export async function deleteHabitAndCompletionsWithStore(
  store: HabitDeletionStore,
  batchSize: number = DELETE_BATCH_SIZE
): Promise<number> {
  let totalDeleted = 0;

  while (true) {
    const ids = await store.fetchCompletionIdsBatch(batchSize);
    if (ids.length === 0) break;
    await store.deleteCompletionIdsBatch(ids);
    totalDeleted += ids.length;
    if (ids.length < batchSize) break;
  }

  await store.deleteHabitDoc();
  return totalDeleted;
}

export function filterActiveHabits(habits: readonly Habit[]): Habit[] {
  return habits.filter((h) => !h.archivedAt);
}

export function filterArchivedHabits(habits: readonly Habit[]): Habit[] {
  return habits.filter((h) => Boolean(h.archivedAt));
}

export function findHabitById(habits: readonly Habit[], habitId: string | undefined): Habit | null {
  if (!habitId) return null;
  return habits.find((h) => h.id === habitId) ?? null;
}

export function isHabitReadOnly(habit: Pick<Habit, 'archivedAt'>): boolean {
  return Boolean(habit.archivedAt);
}

type CompletionCacheAdapter = {
  get: (habitId: string) => Set<DateKey> | undefined;
  set: (habitId: string, next: Set<DateKey>) => void;
};

/**
 * Coordinates per-(habitId, date) in-flight deduplication, optimistic Set updates
 * scoped strictly to one habit's cache key, and error rollback + toast reporting.
 */
export function createCompletionToggleCoordinator(
  cache: CompletionCacheAdapter,
  persist: (habitId: string, date: DateKey, nextValue: boolean) => Promise<void>,
  onErrorToast: (message: string) => void
) {
  const inFlight = new Set<string>();

  return {
    isInFlight(habitId: string, date: DateKey): boolean {
      return inFlight.has(`${habitId}:${date}`);
    },
    async toggle(habitId: string, date: DateKey, nextValue: boolean): Promise<boolean> {
      const lockKey = `${habitId}:${date}`;
      if (inFlight.has(lockKey)) {
        return false;
      }
      inFlight.add(lockKey);

      const previous = cache.get(habitId);
      const next = new Set(previous ?? []);
      if (nextValue) {
        next.add(date);
      } else {
        next.delete(date);
      }
      cache.set(habitId, next);

      try {
        await persist(habitId, date, nextValue);
        return true;
      } catch (err) {
        cache.set(habitId, new Set(previous ?? []));
        onErrorToast(
          err instanceof Error ? err.message : 'Could not update completion.'
        );
        return false;
      } finally {
        inFlight.delete(lockKey);
      }
    },
  };
}
