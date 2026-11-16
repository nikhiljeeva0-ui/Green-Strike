import { safeTimezone, todayKey, type DateKey } from './dates';

export function formatClockParts(
  timezone?: string | null,
  now: Date = new Date()
): { dateText: string; timeText: string } {
  const tz = safeTimezone(timezone);
  const dateText = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const timeText = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  return { dateText, timeText };
}

export function startTodayPolling(
  timezone: string | null | undefined,
  onTodayChange: (next: DateKey) => void,
  intervalMs: number = 30_000
): () => void {
  const tz = safeTimezone(timezone);
  let last = todayKey(tz);
  onTodayChange(last);

  const check = () => {
    const next = todayKey(tz);
    if (next !== last) {
      last = next;
      onTodayChange(next);
    }
  };

  const id = setInterval(check, intervalMs);
  return () => clearInterval(id);
}
