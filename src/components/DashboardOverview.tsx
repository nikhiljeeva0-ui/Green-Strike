import { Plus } from 'lucide-react';
import { useClock } from '../hooks/useToday';
import { StatisticsSummary } from './StatisticsSummary';

function LiveDateTimeRow({ timezone }: { timezone?: string | null }) {
  const { dateText, timeText } = useClock(timezone);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-2)]">
      <span>{dateText}</span>
      <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
      <span className="tabular-nums font-medium text-[var(--text)]">{timeText}</span>
    </div>
  );
}

type DashboardOverviewProps = {
  displayName: string;
  timezone?: string | null;
  activeHabitsCount: number;
  doneTodayCount: number;
  bestCurrentStreak: number;
  bestStreakHabitName: string | null;
  overallPercent: number;
  onAddNewHabit: () => void;
};

export function DashboardOverview({
  displayName,
  timezone,
  activeHabitsCount,
  doneTodayCount,
  bestCurrentStreak,
  bestStreakHabitName,
  overallPercent,
  onAddNewHabit,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif-editorial text-4xl sm:text-5xl text-[var(--text)] tracking-tight leading-tight text-balance">
            Welcome back, {displayName}.
          </h1>
          <p className="mt-2 text-base text-[var(--text-2)]">
            Consistency is built one day at a time.
          </p>
          <LiveDateTimeRow timezone={timezone} />
        </div>

        <button
          type="button"
          onClick={onAddNewHabit}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} aria-hidden="true" />
          Add New Habit
        </button>
      </div>

      <StatisticsSummary
        activeHabitsCount={activeHabitsCount}
        doneTodayCount={doneTodayCount}
        bestCurrentStreak={bestCurrentStreak}
        bestStreakHabitName={bestStreakHabitName}
        overallPercent={overallPercent}
      />
    </div>
  );
}
