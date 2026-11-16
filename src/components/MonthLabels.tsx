import type { MonthLabel } from '../lib/dates';

type MonthLabelsProps = {
  labels: MonthLabel[];
};

export function MonthLabels({ labels }: MonthLabelsProps) {
  return (
    <>
      {labels.map((m) => (
        <div
          key={`${m.colIndex}-${m.label}`}
          style={{ gridColumn: m.colIndex + 2, gridRow: 1 }}
          className="text-[11px] leading-none text-[var(--text-muted)] whitespace-nowrap select-none flex items-end pb-1"
        >
          {m.label}
        </div>
      ))}
    </>
  );
}
