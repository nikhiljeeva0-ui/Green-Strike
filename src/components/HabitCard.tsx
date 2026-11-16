import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowRight, Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCountUp } from '../hooks/useCountUp';
import { useCompletions, useToggleCompletion } from '../hooks/useHabitQueries';
import { todayKey, type DateKey, type RangeMode } from '../lib/dates';
import { completionPercent, currentStreak, totalCompleted } from '../lib/stats';
import type { Habit } from '../lib/types';
import { HabitCalendar } from './HabitCalendar';
import { HabitIcon } from './HabitIcon';
import { RangeSelector } from './RangeSelector';

type HabitCardProps = {
  habit: Habit;
  index: number;
  today: DateKey;
  timezone: string;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onDelete: (habit: Habit, completionCount: number | null) => void;
};

export function HabitCard({
  habit,
  index,
  today,
  timezone,
  onEdit,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const reduced = useReducedMotion();
  const [range, setRange] = useState<RangeMode>('year');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const todayLockRef = useRef(false);

  const { data: completedSet, isLoading } = useCompletions(habit.userId, habit.id);
  const toggleMutation = useToggleCompletion(habit.userId, today);

  const done = useMemo(() => completedSet ?? new Set<DateKey>(), [completedSet]);
  const createdKey = useMemo(
    () => todayKey(timezone, new Date(habit.createdAt)),
    [timezone, habit.createdAt]
  );

  const streakVal = useMemo(() => currentStreak(done, today), [done, today]);
  const totalVal = useMemo(() => totalCompleted(done, today), [done, today]);
  const pctVal = useMemo(
    () => completionPercent(done, today, createdKey),
    [done, today, createdKey]
  );
  const doneToday = done.has(today);

  const animStreak = useCountUp(streakVal, 500);
  const animTotal = useCountUp(totalVal, 500);
  const animPct = useCountUp(pctVal, 500);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const handleToggleDate = async (date: DateKey, nextValue: boolean) => {
    await toggleMutation.mutateAsync({ habitId: habit.id, date, nextValue });
  };

  const handleToggleToday = async () => {
    if (todayLockRef.current) return;
    todayLockRef.current = true;
    try {
      await handleToggleDate(today, !doneToday);
    } finally {
      todayLockRef.current = false;
    }
  };

  const numLabel = `Habit ${String(index + 1).padStart(2, '0')}`;

  return (
    <motion.article
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: reduced ? 0 : Math.min(index, 5) * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[var(--text-muted)] hover:shadow-md min-w-0"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {habit.imageUrl ? (
            <img
              src={habit.imageUrl}
              alt={habit.name}
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-[var(--border)] shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--bright)] shrink-0">
              <HabitIcon icon={habit.icon} size={20} />
            </div>
          )}

          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wider text-[var(--text-muted)]">
              {numLabel}
            </div>
            <div className="flex items-center gap-2 min-w-0 mt-0.5">
              <Link
                to={`/habits/${habit.id}`}
                className="text-lg sm:text-xl font-semibold text-[var(--text)] hover:text-[var(--bright)] transition-colors truncate"
              >
                {habit.name}
              </Link>
              <Link
                to={`/habits/${habit.id}`}
                aria-label={`View details for ${habit.name}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-2)] hover:text-[var(--text)] whitespace-nowrap shrink-0"
              >
                <span>Details</span>
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {habit.description && (
              <p className="text-xs text-[var(--text-2)] truncate mt-0.5 max-w-md">
                {habit.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          <RangeSelector value={range} onChange={setRange} habitName={habit.name} />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={`Actions for ${habit.name}`}
              className="w-11 h-11 md:w-9 md:h-9 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-1.5 z-30"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(habit);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-[var(--text)] hover:bg-[var(--bg-2)] text-left cursor-pointer"
                >
                  <Pencil size={14} className="text-[var(--text-2)]" aria-hidden="true" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(habit);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-[var(--text)] hover:bg-[var(--bg-2)] text-left cursor-pointer"
                >
                  <Archive size={14} className="text-[var(--text-2)]" aria-hidden="true" />
                  <span>Archive</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(habit, isLoading ? null : done.size);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-[var(--bg-2)] text-left cursor-pointer"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats + Primary Daily Action */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Current streak</div>
            <div className="mt-0.5 text-lg font-semibold text-[var(--text)] tabular-nums">
              {animStreak} {animStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Total days</div>
            <div className="mt-0.5 text-lg font-semibold text-[var(--text)] tabular-nums">
              {animTotal}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Completion</div>
            <div className="mt-0.5 text-lg font-semibold text-[var(--text)] tabular-nums">
              {animPct}%
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={toggleMutation.isPending}
          onClick={() => void handleToggleToday()}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
            doneToday
              ? 'bg-[var(--bg-2)] text-[var(--bright)] border border-[var(--bright)]/50 hover:border-[var(--text-2)]'
              : 'bg-[var(--emerald)] text-white hover:brightness-110'
          }`}
        >
          {doneToday ? (
            <>
              <Check size={16} aria-hidden="true" />
              <span>Completed today — Undo</span>
            </>
          ) : (
            <span>Mark today complete</span>
          )}
        </button>
      </div>

      {/* Independent Calendar Instance */}
      <div className="mt-5 min-w-0">
        {isLoading ? (
          <div className="space-y-2 py-2" aria-busy="true" aria-label="Loading calendar">
            <div className="h-28 w-full rounded-xl bg-[var(--bg-2)] animate-pulse" />
          </div>
        ) : (
          <HabitCalendar
            habit={{ id: habit.id, name: habit.name }}
            completed={done}
            today={today}
            mode="compact"
            range={range}
            onRangeChange={setRange}
            onToggle={handleToggleDate}
          />
        )}
      </div>
    </motion.article>
  );
}
