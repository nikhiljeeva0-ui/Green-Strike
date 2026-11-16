import { useEffect, useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHabits, useToggleCompletion } from '../hooks/useHabitQueries';
import { useToday } from '../hooks/useToday';
import { safeTimezone } from '../lib/dates';

export function ReminderBanner() {
  const { user, profile } = useAuth();
  const tz = safeTimezone(profile?.timezone);
  const today = useToday(tz);
  const { data: habits } = useHabits(user?.uid);
  const toggleMutation = useToggleCompletion(user?.uid, today);

  const [currentHHMM, setCurrentHHMM] = useState<string>('');
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const computeHHMM = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());
        setCurrentHHMM(parts);
      } catch {
        // ignore
      }
    };
    computeHHMM();
    const id = window.setInterval(computeHHMM, 20_000);
    return () => window.clearInterval(id);
  }, [tz]);

  const dueHabits = useMemo(() => {
    if (!profile?.remindersEnabled || !habits || !currentHHMM) return [];
    return habits.filter((h) => {
      if (h.archivedAt || !h.reminderTime) return false;
      const key = `${today}:${h.id}:${h.reminderTime}`;
      if (dismissedKeys.has(key)) return false;
      return h.reminderTime === currentHHMM;
    });
  }, [profile?.remindersEnabled, habits, currentHHMM, today, dismissedKeys]);

  if (dueHabits.length === 0) return null;

  const first = dueHabits[0];
  const dismissKey = `${today}:${first.id}:${first.reminderTime}`;

  const dismiss = () => {
    setDismissedKeys((prev) => new Set(prev).add(dismissKey));
  };

  const completeNow = async () => {
    await toggleMutation.mutateAsync({
      habitId: first.id,
      date: today,
      nextValue: true,
    });
    dismiss();
  };

  return (
    <div
      role="region"
      aria-label="Habit reminder"
      className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--bright)]/50">
        <div className="flex items-center gap-3 min-w-0">
          <Bell size={16} className="text-[var(--bright)] shrink-0" aria-hidden="true" />
          <p className="text-sm text-[var(--text)]">
            Reminder for <span className="font-semibold">{first.name}</span> ({first.reminderTime}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void completeNow()}
            className="px-3.5 py-1.5 rounded-full bg-[var(--emerald)] text-white text-xs font-medium hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
          >
            Mark complete
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss reminder"
            className="p-1.5 rounded-full text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
