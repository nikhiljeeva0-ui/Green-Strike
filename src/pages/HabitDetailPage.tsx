import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useArchiveHabit,
  useCompletions,
  useHabits,
  useToggleCompletion,
  useUpdateHabit,
} from '../hooks/useHabitQueries';
import { useToday } from '../hooks/useToday';
import { filterActiveHabits, findHabitById } from '../lib/dbOps';
import { safeTimezone, type DateKey } from '../lib/dates';
import type { HabitDraft } from '../lib/types';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitDetailPanel } from '../components/HabitDetailPanel';

export function HabitDetailPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const { user, profile } = useAuth();
  const tz = safeTimezone(profile?.timezone);
  const today = useToday(tz);

  const { data: habits, isLoading: habitsLoading } = useHabits(user?.uid);
  const habit = useMemo(
    () => findHabitById(habits ?? [], habitId),
    [habits, habitId]
  );

  const { data: completedSet, isLoading: compLoading } = useCompletions(
    user?.uid,
    habit?.id
  );
  const toggleMut = useToggleCompletion(user?.uid, today);
  const updateMut = useUpdateHabit(user?.uid);
  const archiveMut = useArchiveHabit(user?.uid);

  const [editOpen, setEditOpen] = useState(false);

  if (habitsLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-56 rounded-xl bg-[var(--card)] animate-pulse" />
        <div className="h-64 w-full rounded-2xl bg-[var(--card)] animate-pulse" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h1 className="font-serif-editorial text-3xl text-[var(--text)]">
          Habit not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          This habit may have been deleted or does not exist.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--emerald)] text-white text-sm font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const completed = completedSet ?? new Set<DateKey>();

  const handleToggleDate = async (date: DateKey, nextValue: boolean) => {
    await toggleMut.mutateAsync({ habitId: habit.id, date, nextValue });
  };

  const handleEditSubmit = async (draft: HabitDraft) => {
    await updateMut.mutateAsync({ habitId: habit.id, draft });
  };

  const handleArchiveToggle = async () => {
    await archiveMut.mutateAsync({
      habitId: habit.id,
      archive: !Boolean(habit.archivedAt),
    });
  };

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span>Back to dashboard</span>
      </Link>

      <HabitDetailPanel
        habit={habit}
        completed={completed}
        today={today}
        timezone={tz}
        isLoading={compLoading}
        isMutating={toggleMut.isPending}
        onToggleDate={handleToggleDate}
        onEdit={() => setEditOpen(true)}
        onArchiveToggle={handleArchiveToggle}
      />

      <AddHabitModal
        open={editOpen}
        editingHabit={habit}
        existingNames={filterActiveHabits(habits ?? []).map((h) => h.name)}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
