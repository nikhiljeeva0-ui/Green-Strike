import { useEffect, useState } from 'react';
import { formatClockParts, startTodayPolling } from '../lib/clock';
import { safeTimezone, todayKey, type DateKey } from '../lib/dates';

export function useToday(timezone?: string | null): DateKey {
  const tz = safeTimezone(timezone);
  const [today, setToday] = useState<DateKey>(() => todayKey(tz));

  useEffect(() => {
    const sync = () => setToday(todayKey(tz));
    const stopPolling = startTodayPolling(tz, setToday, 30_000);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      stopPolling();
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [tz]);

  return today;
}

export function useClock(timezone?: string | null): { dateText: string; timeText: string } {
  const tz = safeTimezone(timezone);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, [tz]);

  return formatClockParts(tz, now);
}
