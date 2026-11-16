export type DateKey = string; // 'YYYY-MM-DD'

export type RangeMode = '30d' | '6m' | 'year' | 'this-year' | 'last-year';

export type Range = {
  start: DateKey;
  end: DateKey;
};

export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): value is DateKey {
  if (!DATE_KEY_REGEX.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function safeTimezone(tz?: string | null): string {
  if (!tz) return getBrowserTimezone();
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return getBrowserTimezone();
  }
}

export const todayKey = (tz: string, now: Date = new Date()): DateKey =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimezone(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const toUTC = (k: DateKey): number => {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromUTC = (ms: number): DateKey => new Date(ms).toISOString().slice(0, 10);

export const addDays = (k: DateKey, n: number): DateKey =>
  fromUTC(toUTC(k) + n * 86400000);

export const diffDays = (a: DateKey, b: DateKey): number =>
  Math.round((toUTC(a) - toUTC(b)) / 86400000);

export const weekdayMon0 = (k: DateKey): number =>
  (new Date(toUTC(k)).getUTCDay() + 6) % 7; // Mon=0 ... Sun=6

export const monthOf = (k: DateKey): number => Number(k.slice(5, 7)); // 1..12

export const dayOf = (k: DateKey): number => Number(k.slice(8, 10));

export function rangeFor(mode: RangeMode, today: DateKey): Range {
  const y = Number(today.slice(0, 4));
  switch (mode) {
    case '30d':
      return { start: addDays(today, -29), end: today };
    case '6m':
      return { start: addDays(today, -181), end: today };
    case 'year':
      return { start: addDays(today, -364), end: today };
    case 'this-year':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'last-year':
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` };
  }
}

export function buildWeeks(r: Range): DateKey[][] {
  const gridStart = addDays(r.start, -weekdayMon0(r.start));
  const gridEnd = addDays(r.end, 6 - weekdayMon0(r.end));
  const weeks: DateKey[][] = [];
  for (let w = gridStart; w <= gridEnd; w = addDays(w, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }
  return weeks;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type MonthLabel = {
  colIndex: number;
  label: string;
};

export function computeMonthLabels(weeks: DateKey[][], r: Range): MonthLabel[] {
  if (weeks.length === 0) return [];
  const raw: MonthLabel[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const col = weeks[i];
    const firstDayInCol = col.find(
      (d) => d >= r.start && d <= r.end && dayOf(d) === 1
    );
    if (firstDayInCol) {
      raw.push({ colIndex: i, label: MONTH_SHORT[monthOf(firstDayInCol) - 1] });
    }
  }

  // Handle column 0 rule from spec Section 7.5
  const hasCol0 = raw.some((item) => item.colIndex === 0);
  if (!hasCol0) {
    const firstInRange = weeks[0].find((d) => d >= r.start && d <= r.end);
    if (firstInRange) {
      const next = raw[0];
      if (!next || next.colIndex >= 3) {
        raw.unshift({
          colIndex: 0,
          label: MONTH_SHORT[monthOf(firstInRange) - 1],
        });
      }
    }
  }

  // Drop any label < 3 columns from previous placed label
  const filtered: MonthLabel[] = [];
  for (const item of raw) {
    const prev = filtered[filtered.length - 1];
    if (!prev || item.colIndex - prev.colIndex >= 3) {
      filtered.push(item);
    }
  }

  return filtered;
}

export function formatReadableDate(k: DateKey, style: 'short' | 'long' = 'short'): string {
  if (!isValidDateKey(k)) return k;
  const [y, m, d] = k.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  if (style === 'long') {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(utcDate);
  }
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(utcDate);
}
