import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useArchiveHabit,
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useUpdateHabit,
} from '../hooks/useHabitQueries';
import { fetchHabitCompletions } from '../lib/db';
import { filterActiveHabits, filterArchivedHabits } from '../lib/dbOps';
import { formatReadableDate, safeTimezone, todayKey } from '../lib/dates';
import type { Habit, HabitDraft } from '../lib/types';
import { AddHabitModal } from '../components/AddHabitModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { HabitIcon } from '../components/HabitIcon';

export function HabitsPage() {
  const { user, profile } = useAuth();
  const tz = safeTimezone(profile?.timezone);
  const { data: habits, isLoading } = useHabits(user?.uid);

  const createHabitMut = useCreateHabit(user?.uid);
  const updateHabitMut = useUpdateHabit(user?.uid);
  const archiveHabitMut = useArchiveHabit(user?.uid);
  const deleteHabitMut = useDeleteHabit(user?.uid);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    habit: Habit;
    count: number;
  } | null>(null);

  const activeHabits = useMemo(
    () => filterActiveHabits(habits ?? []),
    [habits]
  );
  const archivedHabits = useMemo(
    () => filterArchivedHabits(habits ?? []),
    [habits]
  );

  const handleSave = async (draft: HabitDraft) => {
    if (editingHabit) {
      await updateHabitMut.mutateAsync({ habitId: editingHabit.id, draft });
    } else {
      await createHabitMut.mutateAsync(draft);
    }
  };

  const requestDelete = async (habit: Habit) => {
    if (!user || loadingDeleteId) return;
    setLoadingDeleteId(habit.id);
    try {
      const set = await fetchHabitCompletions(user.uid, habit.id);
      setDeleteTarget({ habit, count: set.size });
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteHabitMut.mutateAsync(deleteTarget.habit.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif-editorial text-4xl sm:text-5xl text-[var(--text)] tracking-tight">
            My Habits
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--text-2)]">
            Edit details, archive pauses without losing history, or permanently remove a habit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} aria-hidden="true" />
          Add New Habit
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--card)] animate-pulse"
            />
          ))}
        </div>
      ) : activeHabits.length === 0 && archivedHabits.length === 0 ? (
        <EmptyState
          onAddClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-8">
          <section aria-label="Active habits">
            <h2 className="text-sm font-semibold text-[var(--text-2)] mb-3">
              Active ({activeHabits.length})
            </h2>
            {activeHabits.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No active habits right now.
              </p>
            ) : (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                {activeHabits.map((h) => {
                  const created = formatReadableDate(
                    todayKey(tz, new Date(h.createdAt)),
                    'short'
                  );
                  return (
                    <div
                      key={h.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--bright)] shrink-0">
                          <HabitIcon icon={h.icon} size={18} />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/habits/${h.id}`}
                            className="text-base font-semibold text-[var(--text)] hover:text-[var(--bright)] transition-colors block truncate"
                          >
                            {h.name}
                          </Link>
                          <div className="text-xs text-[var(--text-2)] truncate mt-0.5">
                            {h.description ? `${h.description} · ` : ''}
                            Created {created}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHabit(h);
                            setModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
                        >
                          <Pencil size={13} aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void archiveHabitMut.mutateAsync({
                              habitId: h.id,
                              archive: true,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
                        >
                          <Archive size={13} aria-hidden="true" />
                          <span>Archive</span>
                        </button>
                        <button
                          type="button"
                          disabled={loadingDeleteId === h.id}
                          onClick={() => void requestDelete(h)}
                          aria-label={`Delete ${h.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-red-600 dark:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          <span>{loadingDeleteId === h.id ? 'Checking...' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {archivedHabits.length > 0 && (
            <section aria-label="Archived habits">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((v) => !v)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
              >
                {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>Archived ({archivedHabits.length})</span>
              </button>

              {showArchived && (
                <div className="mt-3 rounded-[20px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                  {archivedHabits.map((h) => {
                    const created = formatReadableDate(
                      todayKey(tz, new Date(h.createdAt)),
                      'short'
                    );
                    return (
                      <div
                        key={h.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 opacity-85"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] shrink-0">
                            <HabitIcon icon={h.icon} size={18} />
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/habits/${h.id}`}
                              className="text-base font-semibold text-[var(--text)] hover:text-[var(--bright)] transition-colors block truncate"
                            >
                              {h.name}
                            </Link>
                            <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                              Created {created}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void archiveHabitMut.mutateAsync({
                                habitId: h.id,
                                archive: false,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
                          >
                            <RotateCcw size={13} aria-hidden="true" />
                            <span>Unarchive</span>
                          </button>
                          <button
                            type="button"
                            disabled={loadingDeleteId === h.id}
                            onClick={() => void requestDelete(h)}
                            aria-label={`Delete ${h.name}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] md:min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-red-600 dark:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            <span>{loadingDeleteId === h.id ? 'Checking...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <AddHabitModal
        open={modalOpen}
        editingHabit={editingHabit}
        existingNames={activeHabits.map((h) => h.name)}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete habit?"
        message={
          deleteTarget
            ? `Deleting "${deleteTarget.habit.name}" will permanently delete ${deleteTarget.count} ${
                deleteTarget.count === 1 ? 'completion' : 'completions'
              }. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete habit"
        destructive
        loading={deleteHabitMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
