import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  buildWeeks,
  rangeFor,
  todayKey,
  type DateKey,
} from './dates';
import {
  COMPLETION_PAGE_SIZE,
  DELETE_BATCH_SIZE,
  completionsCacheKey,
  createCompletionToggleCoordinator,
  deleteHabitAndCompletionsWithStore,
  fetchAllCompletionDatesPaginated,
  filterActiveHabits,
  findHabitById,
  isHabitReadOnly,
  normalizeReminderTime,
} from './dbOps';
import { formatClockParts, startTodayPolling } from './clock';
import { validateImageFile, MAX_IMAGE_BYTES } from './imageValidation';
import {
  completionPercent,
  currentStreak,
  overallCompletionPercent,
  totalCompleted,
} from './stats';
import type { Habit } from './types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    userId: 'user-1',
    name: 'Daily Reading',
    description: null,
    icon: 'lucide:book-open',
    imageUrl: null,
    reminderTime: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

// TASK 1 — Multi-batch deletion leaves zero orphaned completions
test('Task 1: deleteHabitAndCompletionsWithStore deletes all 950 completions across 3 batches before deleting parent habit', async () => {
  const completions = new Map<string, string>();
  for (let i = 0; i < 950; i++) {
    const key = addDays('2023-01-01', i);
    completions.set(key, key);
  }
  let habitExists = true;
  let batchesDeleted = 0;
  let parentDeletedAfterEmpty = false;

  const totalDeleted = await deleteHabitAndCompletionsWithStore(
    {
      fetchCompletionIdsBatch: async (batchLimit) => {
        assert.equal(batchLimit, DELETE_BATCH_SIZE);
        return Array.from(completions.keys()).slice(0, batchLimit);
      },
      deleteCompletionIdsBatch: async (ids) => {
        assert.ok(ids.length <= 400);
        batchesDeleted++;
        for (const id of ids) {
          completions.delete(id);
        }
      },
      deleteHabitDoc: async () => {
        parentDeletedAfterEmpty = completions.size === 0;
        habitExists = false;
      },
    },
    DELETE_BATCH_SIZE
  );

  assert.equal(totalDeleted, 950);
  assert.equal(batchesDeleted, 3); // 400 + 400 + 150
  assert.equal(completions.size, 0);
  assert.equal(parentDeletedAfterEmpty, true);
  assert.equal(habitExists, false);
});

// TASK 2 — Reminder time normalization enforces HH:MM
test('Task 2: normalizeReminderTime accepts HH:MM or null and rejects malformed values', () => {
  assert.equal(normalizeReminderTime('08:30'), '08:30');
  assert.equal(normalizeReminderTime('23:59'), '23:59');
  assert.equal(normalizeReminderTime(''), null);
  assert.equal(normalizeReminderTime(null), null);
  assert.throws(() => normalizeReminderTime('25:00'), /HH:MM/);
  assert.throws(() => normalizeReminderTime('8:30'), /HH:MM/);
});

// TASK 3 — Client image upload validation enforces MIME and <2 MB limit
test('Task 3: validateImageFile enforces JPEG/PNG/WebP and strictly < 2 MB', () => {
  assert.doesNotThrow(() => validateImageFile({ type: 'image/jpeg', size: 1024 }));
  assert.doesNotThrow(() => validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES - 1 }));
  assert.doesNotThrow(() => validateImageFile({ type: 'image/webp', size: 500_000 }));
  assert.throws(
    () => validateImageFile({ type: 'image/gif', size: 1024 }),
    /JPEG, PNG, or WebP/
  );
  assert.throws(
    () => validateImageFile({ type: 'image/svg+xml', size: 1024 }),
    /JPEG, PNG, or WebP/
  );
  assert.throws(
    () => validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES }),
    /2 MB/
  );
});

// TASK 5.1 — Two habits A and B stay isolated in cache, Sets, and stats
test('Task 5.1: toggling habit A never alters habit B Set, stats, or cache key', async () => {
  const today = '2026-11-16';
  const cache = new Map<string, Set<DateKey>>();
  const keyA = completionsCacheKey('habit-a').join(':');
  const keyB = completionsCacheKey('habit-b').join(':');
  assert.notEqual(keyA, keyB);

  cache.set('habit-a', new Set(['2026-11-15']));
  cache.set('habit-b', new Set(['2026-11-14', '2026-11-15']));

  const controller = createCompletionToggleCoordinator(
    {
      get: (id) => cache.get(id),
      set: (id, next) => cache.set(id, next),
    },
    async () => {},
    () => {}
  );

  await controller.toggle('habit-a', today, true);

  assert.equal(cache.get('habit-a')!.has(today), true);
  assert.equal(cache.get('habit-b')!.has(today), false);
  assert.equal(cache.get('habit-b')!.size, 2);
  assert.equal(currentStreak(cache.get('habit-a')!, today), 2);
  assert.equal(currentStreak(cache.get('habit-b')!, today), 2);
  assert.equal(totalCompleted(cache.get('habit-a')!, today), 2);
  assert.equal(totalCompleted(cache.get('habit-b')!, today), 2);
});

// TASK 5.2 — Pagination across 1,500 completion docs (500 per page)
test('Task 5.2: fetchAllCompletionDatesPaginated loads all 1,500 docs across 3 pages of 500 with no duplicates', async () => {
  const allDocs = Array.from({ length: 1500 }, (_, idx) => {
    const key = addDays('2021-01-01', idx);
    return { id: key, completionDate: key };
  });

  let pagesRequested = 0;
  const result = await fetchAllCompletionDatesPaginated<number>(async (cursor, pageSize) => {
    assert.equal(pageSize, COMPLETION_PAGE_SIZE);
    pagesRequested++;
    const start = cursor ?? 0;
    const slice = allDocs.slice(start, start + pageSize);
    return {
      items: slice,
      lastCursor: start + slice.length,
    };
  }, 500);

  assert.equal(pagesRequested, 4); // pages at 0..500, 500..1000, 1000..1500, then empty 0-item page stops loop
  assert.equal(result.size, 1500);
  assert.equal(result.has(allDocs[0].id), true);
  assert.equal(result.has(allDocs[1499].id), true);
});

// TASK 5.3 — Optimistic toggle: rollback + toast on failure, persists on success, double-click deduplicated
test('Task 5.3: optimistic toggle handles success, failure rollback + error toast, and double-click deduplication', async () => {
  const cache = new Map<string, Set<DateKey>>();
  cache.set('habit-a', new Set(['2026-11-15']));
  const toasts: string[] = [];

  // 1) Failure rolls back and shows error toast
  const failingController = createCompletionToggleCoordinator(
    {
      get: (id) => cache.get(id),
      set: (id, next) => cache.set(id, next),
    },
    async () => {
      throw new Error('Network unavailable');
    },
    (msg) => toasts.push(msg)
  );

  const okFail = await failingController.toggle('habit-a', '2026-11-16', true);
  assert.equal(okFail, false);
  assert.equal(cache.get('habit-a')!.has('2026-11-16'), false);
  assert.equal(cache.get('habit-a')!.size, 1);
  assert.deepEqual(toasts, ['Network unavailable']);

  // 2) Success keeps optimistic update & double-click sends only 1 request
  let writeCalls = 0;
  let releaseWrite!: () => void;
  const slowController = createCompletionToggleCoordinator(
    {
      get: (id) => cache.get(id),
      set: (id, next) => cache.set(id, next),
    },
    async () => {
      writeCalls++;
      await new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
    },
    (msg) => toasts.push(msg)
  );

  const p1 = slowController.toggle('habit-a', '2026-11-16', true);
  assert.equal(cache.get('habit-a')!.has('2026-11-16'), true); // optimistic immediately reflected
  const p2 = slowController.toggle('habit-a', '2026-11-16', false); // double-click while in flight
  releaseWrite();
  const [r1, r2] = await Promise.all([p1, p2]);

  assert.equal(r1, true);
  assert.equal(r2, false);
  assert.equal(writeCalls, 1);
  assert.equal(cache.get('habit-a')!.has('2026-11-16'), true);
});

// TASK 5.4 — useToday polling rolls over at midnight using fake timers
test('Task 5.4: startTodayPolling advances todayKey automatically across midnight without refresh', (t) => {
  // 2026-11-16 23:59:45 UTC
  t.mock.timers.enable({
    apis: ['Date', 'setInterval'],
    now: new Date('2026-11-16T23:59:45.000Z'),
  });

  const observed: DateKey[] = [];
  const stop = startTodayPolling('UTC', (next) => observed.push(next), 30_000);
  assert.deepEqual(observed, ['2026-11-16']);

  // Advance 30s -> 2026-11-17T00:00:15.000Z
  t.mock.timers.tick(30_000);
  assert.deepEqual(observed, ['2026-11-16', '2026-11-17']);

  stop();
});

// TASK 5.5 — Timezone change updates todayKey and formatted clock
test('Task 5.5: changing timezone updates todayKey and clock output consistently', () => {
  const instant = new Date('2026-11-16T22:30:00Z');
  assert.equal(todayKey('America/New_York', instant), '2026-11-16');
  assert.equal(todayKey('Asia/Tokyo', instant), '2026-11-17');

  const nyClock = formatClockParts('America/New_York', instant);
  const tokyoClock = formatClockParts('Asia/Tokyo', instant);
  assert.notEqual(nyClock.dateText, tokyoClock.dateText);
  assert.notEqual(nyClock.timeText, tokyoClock.timeText);
});

// TASK 5.6 — Zero habits / zero completions returns 0 with no NaN or Infinity
test('Task 5.6: completionPercent and overallCompletionPercent return 0 with zero habits or completions', () => {
  const overallEmpty = overallCompletionPercent([], '2026-11-16');
  const singleEmpty = completionPercent(new Set(), '2026-11-16', '2026-11-16');

  assert.equal(overallEmpty, 0);
  assert.equal(singleEmpty, 0);
  assert.equal(Number.isFinite(overallEmpty) && !Number.isNaN(overallEmpty), true);
  assert.equal(Number.isFinite(singleEmpty) && !Number.isNaN(singleEmpty), true);
});

// TASK 5.7 — Archived habits excluded from Dashboard & /calendar, but open read-only on /habits/:id
test('Task 5.7: archived habits excluded from active views while accessible read-only on detail page', () => {
  const active = makeHabit({ id: 'h-active', archivedAt: null });
  const archived = makeHabit({
    id: 'h-archived',
    name: 'Old Habit',
    archivedAt: '2026-11-01T00:00:00.000Z',
  });
  const all = [active, archived];

  const dashboardAndCalendarList = filterActiveHabits(all);
  assert.deepEqual(
    dashboardAndCalendarList.map((h) => h.id),
    ['h-active']
  );

  const detailMatch = findHabitById(all, 'h-archived');
  assert.ok(detailMatch);
  assert.equal(isHabitReadOnly(detailMatch), true);
  assert.equal(isHabitReadOnly(active), false);
});

// TASK 9 — Full-year calendar renders <=371 grid cells and only 1 cell changes on single-date toggle
test('Task 9: full-year calendar has <=371 grid slots and single toggle flips exactly 1 cell', () => {
  const today = '2026-11-16';
  const r = rangeFor('year', today);
  const weeks = buildWeeks(r);
  const totalSlots = weeks.reduce((acc, col) => acc + col.length, 0);
  assert.ok(totalSlots <= 371, `Expected <= 371 cells, got ${totalSlots}`);

  const before = new Set<DateKey>(['2026-11-10', '2026-11-15']);
  const after = new Set<DateKey>(['2026-11-10', '2026-11-15', '2026-11-16']);

  let changedCells = 0;
  for (const col of weeks) {
    for (const d of col) {
      if (before.has(d) !== after.has(d)) changedCells++;
    }
  }
  assert.equal(changedCells, 1);
});

// Rules Risk B — Leading-zero date validation regex + map lookup equivalence
test('Rules Risk B: leading-zero date keys (08, 09) and leap-year regex validate accurately without int("08")', () => {
  const isLeapYearStr = (y: string) =>
    /^([0-9]{2}(0[48]|[2468][048]|[13579][26])|([02468][048]|[13579][26])00)$/.test(y);

  const isValidDateKeyRules = (d: string) =>
    typeof d === 'string' &&
    d.length === 10 &&
    /^[1-9][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(d) &&
    !(['04', '06', '09', '11'].includes(d.slice(5, 7)) && d.slice(8, 10) === '31') &&
    !(d.slice(5, 7) === '02' && ['30', '31'].includes(d.slice(8, 10))) &&
    !(d.slice(5, 7) === '02' && d.slice(8, 10) === '29' && !isLeapYearStr(d.slice(0, 4)));

  const monthToInt: Record<string, number> = {
    '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6,
    '07': 7, '08': 8, '09': 9, '10': 10, '11': 11, '12': 12,
  };
  const dayToInt: Record<string, number> = {
    '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9, '10': 10,
    '11': 11, '12': 12, '13': 13, '14': 14, '15': 15, '16': 16, '17': 17, '18': 18, '19': 19, '20': 20,
    '21': 21, '22': 22, '23': 23, '24': 24, '25': 25, '26': 26, '27': 27, '28': 28, '29': 29, '30': 30,
    '31': 31,
  };

  assert.equal(isValidDateKeyRules('2026-08-09'), true);
  assert.equal(isValidDateKeyRules('2026-09-08'), true);
  assert.equal(monthToInt['08'], 8);
  assert.equal(dayToInt['09'], 9);
  assert.equal(monthToInt['09'], 9);
  assert.equal(dayToInt['08'], 8);

  assert.equal(isValidDateKeyRules('2024-02-29'), true);
  assert.equal(isValidDateKeyRules('2028-02-29'), true);
  assert.equal(isValidDateKeyRules('2400-02-29'), true);
  assert.equal(isValidDateKeyRules('2025-02-29'), false);
  assert.equal(isValidDateKeyRules('2100-02-29'), false);
  assert.equal(isValidDateKeyRules('2026-02-30'), false);
  assert.equal(isValidDateKeyRules('2026-04-31'), false);
  assert.equal(isValidDateKeyRules('2026-09-31'), false);
});
