const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DayLabels() {
  return (
    <>
      {DAYS.map((label, idx) => {
        const showOnMobile = idx === 0 || idx === 2 || idx === 4;
        return (
          <div
            key={label}
            style={{ gridColumn: 1, gridRow: idx + 2 }}
            className="sticky left-0 z-10 flex items-center pr-2 text-[11px] leading-none text-[var(--text-muted)] bg-[var(--card)] select-none"
          >
            <span className={showOnMobile ? 'inline' : 'hidden md:inline'}>
              {label}
            </span>
          </div>
        );
      })}
    </>
  );
}
