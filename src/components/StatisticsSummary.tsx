import { useCountUp } from '../hooks/useCountUp';

type StatisticsSummaryProps = {
  activeHabitsCount: number;
  doneTodayCount: number;
  bestCurrentStreak: number;
  bestStreakHabitName: string | null;
  overallPercent: number;
};

export function StatisticsSummary({
  activeHabitsCount,
  doneTodayCount,
  bestCurrentStreak,
  bestStreakHabitName,
  overallPercent,
}: StatisticsSummaryProps) {
  const animHabits = useCountUp(activeHabitsCount);
  const animDone = useCountUp(doneTodayCount);
  const animStreak = useCountUp(bestCurrentStreak);
  const animPercent = useCountUp(overallPercent);

  return (
    <section
      aria-label="Habit summary statistics"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-xs font-medium text-[var(--text-2)]">Habits</div>
        <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
          {animHabits}
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">Active practices</div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-xs font-medium text-[var(--text-2)]">Done today</div>
        <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
          {animDone} <span className="text-[var(--text-muted)] text-2xl">/ {activeHabitsCount}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">Completed so far</div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-xs font-medium text-[var(--text-2)]">Best current streak</div>
        <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--bright)] tabular-nums">
          {animStreak} <span className="text-xl text-[var(--text-2)]">{animStreak === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)] truncate">
          {bestStreakHabitName ? bestStreakHabitName : 'No active streak yet'}
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-xs font-medium text-[var(--text-2)]">Overall completion</div>
        <div className="mt-2 font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] tabular-nums">
          {animPercent}%
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">Across eligible days</div>
      </div>
    </section>
  );
}
