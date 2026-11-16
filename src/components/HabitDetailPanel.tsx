import { useMemo, useRef, useState } from 'react';
import { Archive, Check, Pencil, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import {
  formatReadableDate,
  todayKey,
  type DateKey,
  type RangeMode,
} from '../lib/dates';
import { isHabitReadOnly } from '../lib/dbOps';
import {
  completionPercent,
  currentStreak,
  longestStreak,
  totalCompleted,
} from '../lib/stats';
import type { Habit } from '../lib/types';
import { HabitCalendar } from './HabitCalendar';
import { HabitIcon } from './HabitIcon';
import { RangeSelector } from './RangeSelector';

type HabitDetailPanelProps = {
  habit: Habit;
  completed: Set<DateKey>;
  today: DateKey;
  timezone: string;
  isLoading: boolean;
  isMutating: boolean;
  onToggleDate: (date: DateKey, nextValue: boolean) => Promise<void>;
  onEdit: () => void;
  onArchiveToggle: () => Promise<void>;
};

export function HabitDetailPanel({
  habit,
  completed,
  today,
  timezone,
  isLoading,
  isMutating,
  onToggleDate,
  onEdit,
  onArchiveToggle,
}: HabitDetailPanelProps) {
  const [range, setRange] = useState<RangeMode>('year');
  const lockRef = useRef<Set<DateKey>>(new Set());
  const isArchived = isHabitReadOnly(habit);

  const safeToggleDate = async (date: DateKey, nextValue: boolean) => {
    if (isArchived || lockRef.current.has(date)) return;
    lockRef.current.add(date);
    try {
      await onToggleDate(date, nextValue);
    } finally {
      lockRef.current.delete(date);
    }
  };

  const createdKey = useMemo(
    () => todayKey(timezone, new Date(habit.createdAt)),
    [timezone, habit.createdAt]
  );

  const curStreak = useMemo(() => currentStreak(completed, today), [completed, today]);
  const bestStreak = useMemo(() => longestStreak(completed, today), [completed, today]);
  const totalDays = useMemo(() => totalCompleted(completed, today), [completed, today]);
  const pct = useMemo(
    () => completionPercent(completed, today, createdKey),
    [completed, today, createdKey]
  );

  const animCur = useCountUp(curStreak);
  const animBest = useCountUp(bestStreak);
  const animTotal = useCountUp(totalDays);
  const animPct = useCountUp(pct);

  const doneToday = completed.has(today);

  const recentDates = useMemo(
    () =>
      [...completed]
        .filter((d) => d <= today)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 10),
    [completed, today]
  );

  return (
    <div className="space-y-6">
      {/* Optional 21:9 cover image */}
      {habit.imageUrl && (
        <div className="relative rounded-[20px] overflow-hidden border border-[var(--border)] aspect-[21/9] bg-[var(--bg-2)]">
          <img
            src={habit.imageUrl}
            alt={habit.name}
            width={1600}
            height={686}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--bright)] shrink-0">
            <HabitIcon icon={habit.icon} size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif-editorial text-3xl sm:text-5xl text-[var(--text)] tracking-tight leading-tight">
                {habit.name}
              </h1>
              {isArchived && (
                <span className="text-xs font-medium text-[var(--text-muted)] border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-0.5 rounded-full">
                  Archived
                </span>
              )}
            </div>
            {habit.description && (
              <p className="mt-2 text-sm sm:text-base text-[var(--text-2)] max-w-2xl">
                {habit.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!isArchived && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void onArchiveToggle()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
          >
            {isArchived ? (
              <>
                <RotateCcw size={14} aria-hidden="true" />
                <span>Unarchive</span>
              </>
            ) : (
              <>
                <Archive size={14} aria-hidden="true" />
                <span>Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-xs text-[var(--text-muted)]">Current streak</div>
          <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
            {animCur} <span className="text-lg text-[var(--text-2)]">{animCur === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Trophy size={13} className="text-[var(--gold)]" aria-hidden="true" />
            <span>Longest streak</span>
          </div>
          <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
            {animBest} <span className="text-lg text-[var(--text-2)]">{animBest === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-xs text-[var(--text-muted)]">Total completed days</div>
          <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
            {animTotal}
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-xs text-[var(--text-muted)]">Completion</div>
          <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
            {animPct}%
          </div>
        </div>
      </div>

      {/* Primary Today Action */}
      {!isArchived && (
        <div>
          <button
            type="button"
            disabled={isMutating}
            onClick={() => void safeToggleDate(today, !doneToday)}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-full text-sm font-medium transition-all cursor-pointer disabled:opacity-60 ${
              doneToday
                ? 'bg-[var(--bg-2)] text-[var(--bright)] border border-[var(--bright)]/50 hover:border-[var(--text-2)]'
                : 'bg-[var(--emerald)] text-white hover:brightness-110'
            }`}
          >
            {doneToday ? (
              <>
                <Check size={16} aria-hidden="true" />
                <span>Undo today&apos;s completion</span>
              </>
            ) : (
              <span>Mark Today Complete</span>
            )}
          </button>
        </div>
      )}

      {/* Full HabitCalendar */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Contribution calendar
          </h2>
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
            onToggle={safeToggleDate}
            readOnly={isArchived}
          />
        )}
      </section>

      {/* Recent history */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--text)]">
          Recent history
        </h2>
        {recentDates.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">No completions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {recentDates.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-[var(--text)]">
                  {formatReadableDate(d, 'short')}
                </span>
                {!isArchived && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void safeToggleDate(d, false)}
                    aria-label={`Undo completion on ${formatReadableDate(d, 'long')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-0 md:py-1 md:px-2.5 rounded-full text-xs text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
                  >
                    <Undo2 size={13} aria-hidden="true" />
                    <span>Undo</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
