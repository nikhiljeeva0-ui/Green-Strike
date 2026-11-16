import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildWeeks,
  computeMonthLabels,
  formatReadableDate,
  isValidDateKey,
  rangeFor,
  type DateKey,
  type RangeMode,
} from '../lib/dates';
import { ContributionSquare, type CellState } from './ContributionSquare';
import { DayLabels } from './DayLabels';
import { MonthLabels } from './MonthLabels';

type HabitCalendarProps = {
  habit: { id: string; name: string };
  completed: Set<DateKey>;
  today: DateKey;
  mode: 'compact' | 'full';
  range: RangeMode;
  onRangeChange: (r: RangeMode) => void;
  onToggle: (date: DateKey, nextValue: boolean) => Promise<void>;
  readOnly?: boolean;
};

type ActivePopover = {
  date: DateKey;
  state: CellState;
  left: number;
  top: number;
};

type HoverTip = {
  date: DateKey;
  state: CellState;
  left: number;
  top: number;
};

export function HabitCalendar({
  habit,
  completed,
  today,
  range,
  onToggle,
  readOnly = false,
}: HabitCalendarProps) {
  // Dev-only invariant check (Section 8.1)
  if (import.meta.env.DEV) {
    for (const d of completed) {
      if (!isValidDateKey(d)) {
        console.error(`Invalid DateKey "${d}" passed to HabitCalendar for habit ${habit.id}`);
      }
    }
  }

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const hoverTimerRef = useRef<number | null>(null);
  const inFlightDatesRef = useRef<Set<DateKey>>(new Set());

  const [hasRevealed, setHasRevealed] = useState(false);
  const [justCompletedDate, setJustCompletedDate] = useState<DateKey | null>(null);
  const [pendingDate, setPendingDate] = useState<DateKey | null>(null);
  const [popover, setPopover] = useState<ActivePopover | null>(null);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const [focusedDate, setFocusedDate] = useState<DateKey | null>(null);

  const r = useMemo(() => rangeFor(range, today), [range, today]);
  const weeks = useMemo(() => buildWeeks(r), [r]);
  const monthLabels = useMemo(() => computeMonthLabels(weeks, r), [weeks, r]);

  // First-view column-by-column reveal triggered once
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || hasRevealed) return;
    if (typeof IntersectionObserver === 'undefined') {
      setHasRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHasRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasRevealed]);

  // Scroll positioning on mount and range change (Section 8.2)
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    requestAnimationFrame(() => {
      if (range === 'last-year') {
        scroller.scrollLeft = 0;
      } else if (range === 'this-year') {
        const todayCol = weeks.findIndex((col) => col.includes(today));
        if (todayCol >= 0) {
          const approxX = Math.max(0, todayCol * 16 - scroller.clientWidth * 0.65);
          scroller.scrollLeft = approxX;
        } else {
          scroller.scrollLeft = scroller.scrollWidth;
        }
      } else {
        scroller.scrollLeft = scroller.scrollWidth;
      }
    });
  }, [range, weeks, today]);

  // Close popover on Escape or outside click
  useEffect(() => {
    if (!popover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopover(null);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-gs-popover="true"]')) return;
      if (target.closest('[data-date]')) return;
      setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [popover]);

  const registerRef = useCallback((date: string, el: HTMLButtonElement | null) => {
    if (el) {
      buttonRefs.current.set(date, el);
    } else {
      buttonRefs.current.delete(date);
    }
  }, []);

  const getCellState = useCallback(
    (d: DateKey): CellState => {
      if (d < r.start || d > r.end) return 'outside';
      if (d > today) return 'future';
      if (completed.has(d)) return 'completed';
      return 'empty';
    },
    [r.start, r.end, today, completed]
  );

  // Pick initial tabbable cell (today if in range, else last in-range cell)
  const initialFocusDate = useMemo(() => {
    if (today >= r.start && today <= r.end) return today;
    for (let c = weeks.length - 1; c >= 0; c--) {
      for (let row = 6; row >= 0; row--) {
        const d = weeks[c][row];
        if (d >= r.start && d <= r.end) return d;
      }
    }
    return r.start;
  }, [weeks, r.start, r.end, today]);

  const activeTabDate = focusedDate ?? initialFocusDate;

  const computeAnchorCoords = useCallback((el: HTMLButtonElement) => {
    const container = wrapperRef.current;
    if (!container) return { left: 0, top: 0 };
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const rawLeft = eRect.left - cRect.left + eRect.width / 2;
    const clampedLeft = Math.max(96, Math.min(cRect.width - 96, rawLeft));
    const top = eRect.top - cRect.top;
    return { left: clampedLeft, top };
  }, []);

  const handleSelect = useCallback(
    (date: DateKey, el: HTMLButtonElement) => {
      if (inFlightDatesRef.current.has(date)) return;
      const state = getCellState(date);
      if (state === 'outside') return;
      setFocusedDate(date);
      setHoverTip(null);
      const { left, top } = computeAnchorCoords(el);
      setPopover((prev) =>
        prev?.date === date ? null : { date, state, left, top }
      );
    },
    [getCellState, computeAnchorCoords]
  );

  const handleHoverEnter = useCallback(
    (date: DateKey, state: CellState, el: HTMLButtonElement) => {
      if (state === 'outside') return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        !window.matchMedia('(hover: hover)').matches
      ) {
        return;
      }
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = window.setTimeout(() => {
        const { left, top } = computeAnchorCoords(el);
        setHoverTip({ date, state, left, top });
      }, 120);
    },
    [computeAnchorCoords]
  );

  const handleHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverTip(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, col: number, row: number) => {
      let dCol = 0;
      let dRow = 0;
      if (e.key === 'ArrowRight') dCol = 1;
      else if (e.key === 'ArrowLeft') dCol = -1;
      else if (e.key === 'ArrowDown') dRow = 1;
      else if (e.key === 'ArrowUp') dRow = -1;
      else return;

      e.preventDefault();
      let nc = col + dCol;
      let nr = row + dRow;

      while (nc >= 0 && nc < weeks.length && nr >= 0 && nr < 7) {
        const candidate = weeks[nc][nr];
        if (candidate >= r.start && candidate <= r.end) {
          setFocusedDate(candidate);
          const btn = buttonRefs.current.get(candidate);
          btn?.focus();
          return;
        }
        nc += dCol;
        nr += dRow;
      }
    },
    [weeks, r.start, r.end]
  );

  const handlePopoverAction = useCallback(async () => {
    if (!popover || readOnly) return;
    const { date, state } = popover;
    if (state === 'future' || state === 'outside') return;
    if (inFlightDatesRef.current.has(date)) return;
    inFlightDatesRef.current.add(date);
    const nextValue = state !== 'completed';
    setPopover(null);
    setPendingDate(date);
    if (nextValue) {
      setJustCompletedDate(date);
      window.setTimeout(() => {
        setJustCompletedDate((curr) => (curr === date ? null : curr));
      }, 600);
    }
    try {
      await onToggle(date, nextValue);
    } finally {
      window.setTimeout(() => {
        inFlightDatesRef.current.delete(date);
        setPendingDate((curr) => (curr === date ? null : curr));
      }, 300);
    }
  }, [popover, onToggle, readOnly]);

  const gridStyle = useMemo<React.CSSProperties>(
    () => ({
      gridTemplateColumns: `44px repeat(${weeks.length}, var(--cell))`,
      gridTemplateRows: `18px repeat(7, var(--cell))`,
      gap: '3px',
    }),
    [weeks.length]
  );

  const rangeReadable =
    range === '30d'
      ? 'last 30 days'
      : range === '6m'
      ? 'last 6 months'
      : range === 'year'
      ? 'last 365 days'
      : range === 'this-year'
      ? 'this year'
      : 'last year';

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <div
        ref={scrollRef}
        role="group"
        aria-label={`${habit.name} contribution calendar, ${rangeReadable}`}
        className="gs-cal-scroll overflow-x-auto pb-2 min-w-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="inline-grid [--cell:12px] md:[--cell:13px]"
          style={gridStyle}
        >
          <MonthLabels labels={monthLabels} />
          <DayLabels />
          {weeks.map((col, colIndex) =>
            col.map((date, rowIndex) => {
              const state = getCellState(date);
              return (
                <ContributionSquare
                  key={date}
                  date={date}
                  readableDate={formatReadableDate(date, 'long')}
                  state={state}
                  isToday={date === today}
                  habitName={habit.name}
                  colIndex={colIndex}
                  rowIndex={rowIndex}
                  justCompleted={justCompletedDate === date}
                  hasRevealed={hasRevealed}
                  tabIndex={date === activeTabDate ? 0 : -1}
                  disabled={pendingDate === date}
                  onSelect={handleSelect}
                  onHoverEnter={handleHoverEnter}
                  onHoverLeave={handleHoverLeave}
                  onKeyDown={handleKeyDown}
                  registerRef={registerRef}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Hover Tooltip (desktop fine-pointer) */}
      {hoverTip && !popover && (
        <div
          role="tooltip"
          style={{
            left: hoverTip.left,
            top: Math.max(0, hoverTip.top - 8),
            transform: 'translate(-50%, -100%)',
          }}
          className="pointer-events-none absolute z-30 px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] shadow-md whitespace-nowrap transition-opacity duration-120"
        >
          <span className="font-medium">{habit.name}</span>
          <span className="text-[var(--text-muted)]"> · </span>
          <span>{formatReadableDate(hoverTip.date, 'short')}</span>
          <span className="text-[var(--text-muted)]"> · </span>
          <span
            className={
              hoverTip.state === 'completed'
                ? 'text-[var(--bright)] font-medium'
                : 'text-[var(--text-2)]'
            }
          >
            {hoverTip.state === 'completed'
              ? 'Completed'
              : hoverTip.state === 'future'
              ? 'Future date'
              : 'Not completed'}
          </span>
        </div>
      )}

      {/* Interactive Cell Popover */}
      {popover && (
        <div
          data-gs-popover="true"
          role="dialog"
          aria-label={`${habit.name} ${formatReadableDate(popover.date, 'long')}`}
          style={{
            left: popover.left,
            top: Math.max(8, popover.top - 10),
            transform: 'translate(-50%, -100%)',
          }}
          className="absolute z-40 w-56 p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl"
        >
          <div className="text-xs font-medium text-[var(--text-muted)] truncate">
            {habit.name}
          </div>
          <div className="text-sm font-medium text-[var(--text)] mt-0.5">
            {formatReadableDate(popover.date, 'long')}
          </div>
          <div className="text-xs mt-1 text-[var(--text-2)]">
            {popover.state === 'completed'
              ? 'Completed'
              : popover.state === 'future'
              ? "Future dates can't be completed."
              : 'Not completed'}
          </div>
          {popover.state !== 'future' && !readOnly && (
            <button
              type="button"
              disabled={pendingDate === popover.date}
              onClick={() => void handlePopoverAction()}
              className={`mt-3 w-full py-2 min-h-[44px] md:min-h-0 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                popover.state === 'completed'
                  ? 'bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--text-2)]'
                  : 'bg-[var(--emerald)] text-white hover:brightness-110'
              }`}
            >
              {popover.state === 'completed' ? 'Undo completion' : 'Mark complete'}
            </button>
          )}
        </div>
      )}

      {/* Minimal Two-State Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-[2px] bg-[var(--bright)] inline-block"
            aria-hidden="true"
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-[2px] bg-[var(--cell-empty)] inline-block"
            aria-hidden="true"
          />
          Not completed
        </span>
      </div>
    </div>
  );
}
