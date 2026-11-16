import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  diffDays,
  buildWeeks,
  computeMonthLabels,
  rangeFor,
  todayKey,
  weekdayMon0,
} from './dates';
import {
  completionPercent,
  currentStreak,
  longestStreak,
  overallCompletionPercent,
  totalCompleted,
} from './stats';

test('streak with today done + 4 prior consecutive days is 5', () => {
  const done = new Set([
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
    '2026-11-16',
  ]);
  assert.equal(currentStreak(done, '2026-11-16'), 5);
});

test('today not done, yesterday + 3 before done keeps streak of 4', () => {
  const done = new Set([
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
  ]);
  assert.equal(currentStreak(done, '2026-11-16'), 4);
});

test('today not done and yesterday not done returns 0', () => {
  const done = new Set(['2026-11-13', '2026-11-14']);
  assert.equal(currentStreak(done, '2026-11-16'), 0);
});

test('gap of one day in the middle counts only the latest run', () => {
  const done = new Set([
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    // gap on 2026-11-13
    '2026-11-14',
    '2026-11-15',
    '2026-11-16',
  ]);
  assert.equal(currentStreak(done, '2026-11-16'), 3);
});

test('longest streak across a gap returns max run, not total', () => {
  const done = new Set([
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    // gap
    '2026-11-10',
    '2026-11-11',
  ]);
  assert.equal(longestStreak(done), 4);
});

test('year boundary Dec 30 -> Jan 2 counted as 4 consecutive', () => {
  const done = new Set([
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
  ]);
  assert.equal(currentStreak(done, '2026-01-02'), 4);
  assert.equal(longestStreak(done), 4);
});

test('leap day 2028-02-29 handled accurately', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(diffDays('2028-03-01', '2028-02-28'), 2);
});

test('DST transitions have no off-by-one in addDays/diffDays', () => {
  // US spring forward 2026-03-08 & fall back 2026-11-01
  assert.equal(addDays('2026-03-07', 2), '2026-03-09');
  assert.equal(diffDays('2026-03-09', '2026-03-07'), 2);
  assert.equal(addDays('2026-10-31', 2), '2026-11-02');
  assert.equal(diffDays('2026-11-02', '2026-10-31'), 2);
});

test('buildWeeks has 7 entries per column and first row is always Monday', () => {
  const r = rangeFor('year', '2026-11-16');
  const weeks = buildWeeks(r);
  assert.ok(weeks.length >= 52 && weeks.length <= 54);
  for (const col of weeks) {
    assert.equal(col.length, 7);
    assert.equal(weekdayMon0(col[0]), 0); // Monday
    assert.equal(weekdayMon0(col[6]), 6); // Sunday
  }
});

test('todayKey respects timezone differences across date line', () => {
  const instant = new Date('2026-11-16T12:00:00Z');
  const kiritimati = todayKey('Pacific/Kiritimati', instant); // UTC+14 -> 2026-11-17
  const pago = todayKey('Pacific/Pago_Pago', instant); // UTC-11 -> 2026-11-16
  assert.notEqual(kiritimati, pago);
  assert.equal(diffDays(kiritimati, pago), 1);
});

test('completionPercent with 3 done out of 10 eligible returns 30', () => {
  const done = new Set(['2026-11-07', '2026-11-10', '2026-11-16']);
  assert.equal(completionPercent(done, '2026-11-16', '2026-11-07'), 30);
  // Backfilled before createdKey expands eligible window
  const backfilled = new Set(['2026-11-05', '2026-11-16']);
  assert.equal(completionPercent(backfilled, '2026-11-16', '2026-11-10'), 17); // 2/12 = 16.6 -> 17
});

test('totalCompleted ignores future dates defensively and overallCompletionPercent aggregates', () => {
  const done = new Set(['2026-11-15', '2026-11-16', '2026-11-20']);
  assert.equal(totalCompleted(done, '2026-11-16'), 2);
  const overall = overallCompletionPercent(
    [
      { done: new Set(['2026-11-15', '2026-11-16']), createdKey: '2026-11-15' },
      { done: new Set([]), createdKey: '2026-11-15' },
    ],
    '2026-11-16'
  );
  assert.equal(overall, 50); // 2 / 4 = 50%
});

test('computeMonthLabels places non-overlapping labels spaced by >= 3 columns', () => {
  const r = rangeFor('year', '2026-11-16');
  const weeks = buildWeeks(r);
  const labels = computeMonthLabels(weeks, r);
  assert.ok(labels.length >= 10);
  for (let i = 1; i < labels.length; i++) {
    assert.ok(labels[i].colIndex - labels[i - 1].colIndex >= 3);
  }
});
