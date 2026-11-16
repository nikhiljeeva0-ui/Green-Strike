import { addDays, diffDays, isValidDateKey, type DateKey } from './dates';

export function currentStreak(done: Set<DateKey>, today: DateKey): number {
  let cursor = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function longestStreak(done: Set<DateKey>, today?: DateKey): number {
  const days = [...done]
    .filter((d) => isValidDateKey(d) && (!today || d <= today))
    .sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of days) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

export function totalCompleted(done: Set<DateKey>, today: DateKey): number {
  let count = 0;
  for (const d of done) {
    if (isValidDateKey(d) && d <= today) {
      count++;
    }
  }
  return count;
}

export function completionStats(
  done: Set<DateKey>,
  today: DateKey,
  createdKey: DateKey
): { count: number; eligible: number; percent: number } {
  let first = createdKey <= today ? createdKey : today;
  for (const d of done) {
    if (isValidDateKey(d) && d <= today && d < first) {
      first = d;
    }
  }
  const eligible = Math.max(1, diffDays(today, first) + 1);
  const count = totalCompleted(done, today);
  const percent = Math.max(0, Math.min(100, Math.round((count / eligible) * 100)));
  return { count, eligible, percent };
}

export function completionPercent(
  done: Set<DateKey>,
  today: DateKey,
  createdKey: DateKey
): number {
  return completionStats(done, today, createdKey).percent;
}

export function overallCompletionPercent(
  items: Array<{ done: Set<DateKey>; createdKey: DateKey }>,
  today: DateKey
): number {
  if (items.length === 0) return 0;
  let sumCount = 0;
  let sumEligible = 0;
  for (const item of items) {
    const s = completionStats(item.done, today, item.createdKey);
    sumCount += s.count;
    sumEligible += s.eligible;
  }
  if (sumEligible === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((sumCount / sumEligible) * 100)));
}
