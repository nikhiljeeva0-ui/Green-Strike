import type { RangeMode } from '../lib/dates';

const OPTIONS: Array<{ value: RangeMode; label: string }> = [
  { value: '30d', label: '30D' },
  { value: '6m', label: '6M' },
  { value: 'year', label: 'Full year' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
];

type RangeSelectorProps = {
  value: RangeMode;
  onChange: (next: RangeMode) => void;
  habitName?: string;
};

export function RangeSelector({ value, onChange, habitName }: RangeSelectorProps) {
  return (
    <div
      role="group"
      aria-label={habitName ? `${habitName} calendar range` : 'Calendar range'}
      className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[var(--bg-2)] border border-[var(--border)] overflow-x-auto max-w-full"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`px-2.5 py-2 min-h-[44px] md:min-h-0 md:py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? 'bg-[var(--card)] text-[var(--text)] shadow-xs border border-[var(--border)]'
                : 'text-[var(--text-2)] hover:text-[var(--text)] border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
