import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  useArchiveHabit,
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useUpdateHabit,
} from '../hooks/useHabitQueries';
import { useToday } from '../hooks/useToday';
import { fetchHabitCompletions } from '../lib/db';
import { filterActiveHabits } from '../lib/dbOps';
import { safeTimezone, todayKey, type DateKey } from '../lib/dates';
import {
  completionStats,
  currentStreak,
  overallCompletionPercent,
} from '../lib/stats';
import type { Habit, HabitDraft } from '../lib/types';
import { AddHabitModal } from '../components/AddHabitModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DashboardOverview } from '../components/DashboardOverview';
import { EmptyState } from '../components/EmptyState';
import { HabitCard } from '../components/HabitCard';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const tz = safeTimezone(profile?.timezone);
  const today = useToday(tz);

  const { data: habits, isLoading } = useHabits(user?.uid);
  const createHabitMut = useCreateHabit(user?.uid);
  const updateHabitMut = useUpdateHabit(user?.uid);
  const archiveHabitMut = useArchiveHabit(user?.uid);
  const deleteHabitMut = useDeleteHabit(user?.uid);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    habit: Habit;
    count: number;
  } | null>(null);

  const activeHabits = useMemo(
    () => filterActiveHabits(habits ?? []),
    [habits]
  );

  // Per-habit independent completion queries (shares exact ['completions', habitId] cache with HabitCard)
  const completionQueries = useQueries({
    queries: activeHabits.map((h) => ({
      queryKey: ['completions', h.id] as const,
      queryFn: () => fetchHabitCompletions(user!.uid, h.id),
      enabled: Boolean(user?.uid),
      staleTime: 60_000,
    })),
  });

  const summary = useMemo(() => {
    let doneTodayCount = 0;
    let bestCurrentStreak = 0;
    let bestStreakHabitName: string | null = null;
    const perHabitStats: Array<{ done: Set<DateKey>; createdKey: DateKey }> = [];

    activeHabits.forEach((h, i) => {
      const done = completionQueries[i]?.data ?? new Set<DateKey>();
      if (done.has(today)) doneTodayCount++;
      const streak = currentStreak(done, today);
      if (streak > bestCurrentStreak) {
        bestCurrentStreak = streak;
        bestStreakHabitName = h.name;
      }
      const createdKey = todayKey(tz, new Date(h.createdAt));
      // Touch completionStats to ensure consistent eligibility window
      completionStats(done, today, createdKey);
      perHabitStats.push({ done, createdKey });
    });

    const overallPercent = overallCompletionPercent(perHabitStats, today);
    return {
      doneTodayCount,
      bestCurrentStreak,
      bestStreakHabitName,
      overallPercent,
    };
  }, [activeHabits, completionQueries, today, tz]);

  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Friend';

  const handleSaveHabit = async (draft: HabitDraft) => {
    if (editingHabit) {
      await updateHabitMut.mutateAsync({ habitId: editingHabit.id, draft });
    } else {
      await createHabitMut.mutateAsync(draft);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteHabitMut.mutateAsync(deleteTarget.habit.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      <DashboardOverview
        displayName={displayName}
        timezone={tz}
        activeHabitsCount={activeHabits.length}
        doneTodayCount={summary.doneTodayCount}
        bestCurrentStreak={summary.bestCurrentStreak}
        bestStreakHabitName={summary.bestStreakHabitName}
        overallPercent={summary.overallPercent}
        onAddNewHabit={() => {
          setEditingHabit(null);
          setModalOpen(true);
        }}
      />

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading habits">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4"
            >
              <div className="h-6 w-48 rounded-lg bg-[var(--bg-2)] animate-pulse" />
              <div className="h-32 w-full rounded-xl bg-[var(--bg-2)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : activeHabits.length === 0 ? (
        <EmptyState
          onAddClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-6">
          {activeHabits.map((habit, index) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              index={index}
              today={today}
              timezone={tz}
              onEdit={(h) => {
                setEditingHabit(h);
                setModalOpen(true);
              }}
              onArchive={(h) => {
                void archiveHabitMut.mutateAsync({ habitId: h.id, archive: true });
              }}
              onDelete={(h, completionCount) => {
                if (completionCount !== null) {
                  setDeleteTarget({ habit: h, count: completionCount });
                } else if (user) {
                  void fetchHabitCompletions(user.uid, h.id).then((set) => {
                    setDeleteTarget({ habit: h, count: set.size });
                  });
                }
              }}
            />
          ))}
        </div>
      )}

      <AddHabitModal
        open={modalOpen}
        editingHabit={editingHabit}
        existingNames={activeHabits.map((h) => h.name)}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSaveHabit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete habit?"
        message={
          deleteTarget
            ? `Deleting "${deleteTarget.habit.name}" will permanently delete ${deleteTarget.count} ${
                deleteTarget.count === 1 ? 'completion' : 'completions'
              }. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete habit"
        destructive
        loading={deleteHabitMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
