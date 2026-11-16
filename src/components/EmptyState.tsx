import { Plus } from 'lucide-react';

type EmptyStateProps = {
  onAddClick?: () => void;
};

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-12 text-center">
      <h2 className="font-serif-editorial text-3xl sm:text-4xl text-[var(--text)] text-balance">
        Your first green dot is one habit away.
      </h2>
      <p className="mt-3 text-sm sm:text-base text-[var(--text-2)] max-w-md mx-auto">
        Create a single daily practice. Each habit you track lives in its own quiet space with its own contribution calendar.
      </p>

      {/* Mint-outlined empty sample frame (never filled with fake dots) */}
      <div className="mt-8 mx-auto max-w-lg rounded-2xl border border-[var(--mint)]/45 bg-[var(--bg-2)]/60 p-6">
        <div className="grid grid-cols-12 gap-1.5 opacity-45" aria-hidden="true">
          {Array.from({ length: 48 }).map((_, idx) => (
            <span
              key={idx}
              className="h-3 rounded-[3px] bg-[var(--cell-empty)]"
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Your calendar will appear here
        </p>
      </div>

      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          Add New Habit
        </button>
      )}
    </div>
  );
}
