import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useCompletions,
  useCreateHabit,
  useHabits,
  useToggleCompletion,
} from '../hooks/useHabitQueries';
import { useToday } from '../hooks/useToday';
import { filterActiveHabits } from '../lib/dbOps';
import { safeTimezone, type DateKey, type RangeMode } from '../lib/dates';
import type { Habit, HabitDraft } from '../lib/types';
import { AddHabitModal } from '../components/AddHabitModal';
import { EmptyState } from '../components/EmptyState';
import { HabitCalendar } from '../components/HabitCalendar';
import { HabitIcon } from '../components/HabitIcon';
import { RangeSelector } from '../components/RangeSelector';

function IndependentCalendarSection({
  habit,
  today,
}: {
  habit: Habit;
  today: DateKey;
}) {
  const [range, setRange] = useState<RangeMode>('year');
  const { data: completedSet, isLoading } = useCompletions(habit.userId, habit.id);
  const toggleMut = useToggleCompletion(habit.userId, today);

  const completed = useMemo(() => completedSet ?? new Set<DateKey>(), [completedSet]);

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--bright)] shrink-0">
            <HabitIcon icon={habit.icon} size={18} />
          </div>
          <div className="min-w-0">
            <Link
              to={`/habits/${habit.id}`}
              className="text-lg font-semibold text-[var(--text)] hover:text-[var(--bright)] transition-colors truncate block"
            >
              {habit.name}
            </Link>
          </div>
        </div>

        <RangeSelector value={range} onChange={setRange} habitName={habit.name} />
      </div>

      {isLoading ? (
        <div className="h-32 w-full rounded-xl bg-[var(--bg-2)] animate-pulse" />
      ) : (
        <HabitCalendar
          habit={{ id: habit.id, name: habit.name }}
          completed={completed}
          today={today}
          mode="full"
          range={range}
          onRangeChange={setRange}
          onToggle={async (date, nextValue) => {
            await toggleMut.mutateAsync({ habitId: habit.id, date, nextValue });
          }}
        />
      )}
    </section>
  );
}

export function CalendarPage() {
  const { user, profile } = useAuth();
  const tz = safeTimezone(profile?.timezone);
  const today = useToday(tz);
  const { data: habits, isLoading } = useHabits(user?.uid);
  const createHabitMut = useCreateHabit(user?.uid);
  const [modalOpen, setModalOpen] = useState(false);

  const activeHabits = useMemo(
    () => filterActiveHabits(habits ?? []),
    [habits]
  );

  const handleCreate = async (draft: HabitDraft) => {
    await createHabitMut.mutateAsync(draft);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif-editorial text-4xl sm:text-5xl text-[var(--text)] tracking-tight">
          Calendar
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--text-2)]">
          Each active habit maintains its own independent full-year calendar.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-44 rounded-[20px] border border-[var(--border)] bg-[var(--card)] animate-pulse" />
        </div>
      ) : activeHabits.length === 0 ? (
        <EmptyState onAddClick={() => setModalOpen(true)} />
      ) : (
        <div className="space-y-6">
          {activeHabits.map((h) => (
            <IndependentCalendarSection key={h.id} habit={h} today={today} />
          ))}
        </div>
      )}

      <AddHabitModal
        open={modalOpen}
        existingNames={activeHabits.map((h) => h.name)}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
