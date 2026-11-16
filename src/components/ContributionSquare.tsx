import React from 'react';

export type CellState = 'outside' | 'future' | 'empty' | 'completed';

type ContributionSquareProps = {
  date: string;
  readableDate: string;
  state: CellState;
  isToday: boolean;
  habitName: string;
  colIndex: number;
  rowIndex: number;
  justCompleted: boolean;
  hasRevealed: boolean;
  tabIndex: number;
  disabled: boolean;
  onSelect: (date: string, el: HTMLButtonElement) => void;
  onHoverEnter: (date: string, state: CellState, el: HTMLButtonElement) => void;
  onHoverLeave: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, col: number, row: number) => void;
  registerRef: (date: string, el: HTMLButtonElement | null) => void;
};

export const ContributionSquare = React.memo(function ContributionSquare({
  date,
  readableDate,
  state,
  isToday,
  habitName,
  colIndex,
  rowIndex,
  justCompleted,
  hasRevealed,
  tabIndex,
  disabled,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  onKeyDown,
  registerRef,
}: ContributionSquareProps) {
  const gridStyle: React.CSSProperties = {
    gridColumn: colIndex + 2,
    gridRow: rowIndex + 2,
    transitionDelay: !hasRevealed ? `${Math.min(600, colIndex * 4)}ms` : '0ms',
  };

  if (state === 'outside') {
    return (
      <div
        style={gridStyle}
        aria-hidden="true"
        className="w-[var(--cell)] h-[var(--cell)] rounded-[3px] pointer-events-none"
      />
    );
  }

  const statusText =
    state === 'completed'
      ? 'completed'
      : state === 'future'
      ? 'future date'
      : 'not completed';

  const bgColor =
    state === 'completed'
      ? 'bg-[var(--bright)]'
      : state === 'future'
      ? 'bg-[var(--cell-future)] cursor-not-allowed'
      : 'bg-[var(--cell-empty)] hover:brightness-95 dark:hover:brightness-110 cursor-pointer';

  const todayRing = isToday
    ? 'ring-[1.5px] ring-[var(--text-2)] ring-offset-0'
    : '';

  const revealOpacity = hasRevealed ? 'opacity-100' : 'opacity-0';

  return (
    <button
      ref={(el) => registerRef(date, el)}
      type="button"
      data-date={date}
      data-state={state}
      tabIndex={tabIndex}
      aria-disabled={state === 'future' || disabled ? true : undefined}
      aria-label={`${habitName}, ${readableDate}, ${statusText}`}
      style={gridStyle}
      onClick={(e) => onSelect(date, e.currentTarget)}
      onMouseEnter={(e) => onHoverEnter(date, state, e.currentTarget)}
      onMouseLeave={onHoverLeave}
      onKeyDown={(e) => onKeyDown(e, colIndex, rowIndex)}
      className={`relative w-[var(--cell)] h-[var(--cell)] rounded-[3px] transition-[background-color,opacity] duration-200 focus-visible:z-20 ${bgColor} ${todayRing} ${revealOpacity} ${
        justCompleted ? 'gs-square-complete-pop gs-square-ripple' : ''
      }`}
    />
  );
});
