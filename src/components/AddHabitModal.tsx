import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { uploadUserImage, SUGGESTED_COVERS } from '../lib/storage';
import { SUGGESTED_HABITS, type Habit, type HabitDraft } from '../lib/types';
import { HabitIcon } from './HabitIcon';

const ICON_OPTIONS = [
  { id: 'lucide:dumbbell', label: 'Fitness' },
  { id: 'lucide:book-open', label: 'Book' },
  { id: 'lucide:laptop', label: 'Laptop' },
  { id: 'lucide:rocket', label: 'Rocket' },
  { id: 'lucide:brain', label: 'Brain' },
  { id: 'lucide:footprints', label: 'Running' },
  { id: 'lucide:droplets', label: 'Water' },
  { id: 'lucide:sprout', label: 'Growth' },
];

type AddHabitModalProps = {
  open: boolean;
  editingHabit?: Habit | null;
  existingNames?: string[];
  onClose: () => void;
  onSubmit: (draft: HabitDraft) => Promise<void>;
};

export function AddHabitModal({
  open,
  editingHabit = null,
  existingNames = [],
  onClose,
  onSubmit,
}: AddHabitModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('lucide:sprout');
  const [customEmojiMode, setCustomEmojiMode] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingHabit) {
      setName(editingHabit.name);
      setDescription(editingHabit.description ?? '');
      setImageUrl(editingHabit.imageUrl ?? null);
      setReminderTime(editingHabit.reminderTime ?? '');
      if (editingHabit.icon.startsWith('emoji:')) {
        setCustomEmojiMode(true);
        setCustomEmoji(editingHabit.icon.slice(6));
        setIcon(editingHabit.icon);
      } else {
        setCustomEmojiMode(false);
        setCustomEmoji('');
        setIcon(editingHabit.icon || 'lucide:sprout');
      }
    } else {
      setName('');
      setIcon('lucide:sprout');
      setCustomEmojiMode(false);
      setCustomEmoji('');
      setDescription('');
      setImageUrl(null);
      setReminderTime('');
    }
    setNameError(null);
    setSubmitting(false);

    window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 30);
  }, [open, editingHabit]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  const trimmedName = name.trim();
  const isDuplicate =
    Boolean(trimmedName) &&
    existingNames.some(
      (n) =>
        n.toLowerCase() === trimmedName.toLowerCase() &&
        n.toLowerCase() !== (editingHabit?.name ?? '').toLowerCase()
    );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadUserImage(file, user.uid, 'habit-covers');
      setImageUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to process image.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploading) return;

    if (!trimmedName) {
      setNameError('Please enter a habit name.');
      nameInputRef.current?.focus();
      return;
    }
    if (trimmedName.length > 60) {
      setNameError('Habit name must be 60 characters or fewer.');
      return;
    }

    let finalIcon = icon;
    if (customEmojiMode) {
      const cleanEmoji = Array.from(customEmoji.trim())[0] || '🌱';
      finalIcon = `emoji:${cleanEmoji}`;
    }

    setSubmitting(true);
    setNameError(null);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() ? description.trim().slice(0, 280) : null,
        icon: finalIcon,
        imageUrl,
        reminderTime: reminderTime || null,
      });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save habit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-habit-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg my-8 rounded-[24px] bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="add-habit-modal-title"
                className="font-serif-editorial text-2xl sm:text-3xl text-[var(--text)]"
              >
                {editingHabit ? 'Edit habit' : 'Create a habit'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
              {/* Name */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="habit-name-input"
                    className="block text-sm font-medium text-[var(--text)]"
                  >
                    Habit name
                  </label>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {name.length}/60
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  id="habit-name-input"
                  type="text"
                  maxLength={60}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g., Morning workout"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--bright)] focus:outline-none"
                />
                {nameError && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
                    {nameError}
                  </p>
                )}
                {!nameError && isDuplicate && (
                  <p className="mt-1.5 text-xs text-[var(--gold)]">
                    You already have an active habit with this name. You can still save it.
                  </p>
                )}

                {!editingHabit && (
                  <div className="mt-2.5">
                    <div className="text-xs text-[var(--text-muted)] mb-1.5">
                      Quick suggestions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_HABITS.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setName(chip.label);
                            setIcon(chip.icon);
                            setCustomEmojiMode(false);
                            setNameError(null);
                          }}
                          className="px-2.5 py-1 rounded-full text-xs border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Icon Picker */}
              <div>
                <div className="text-sm font-medium text-[var(--text)] mb-2">Icon</div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const selected = !customEmojiMode && icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setCustomEmojiMode(false);
                          setIcon(opt.id);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[var(--bg-2)] border-[var(--bright)] text-[var(--text)]'
                            : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)]'
                        }`}
                      >
                        <HabitIcon icon={opt.id} size={17} />
                        <span className="truncate max-w-full">{opt.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCustomEmojiMode(true)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                      customEmojiMode
                        ? 'bg-[var(--bg-2)] border-[var(--bright)] text-[var(--text)]'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="text-base leading-none">
                      {customEmoji ? Array.from(customEmoji)[0] : '✨'}
                    </span>
                    <span>Custom</span>
                  </button>
                </div>

                {customEmojiMode && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <label htmlFor="custom-emoji-input" className="text-xs text-[var(--text-2)]">
                      Single emoji:
                    </label>
                    <input
                      id="custom-emoji-input"
                      type="text"
                      value={customEmoji}
                      onChange={(e) => {
                        const chars = Array.from(e.target.value.trim());
                        setCustomEmoji(chars[0] || '');
                      }}
                      placeholder="🎯"
                      className="w-16 text-center px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-base"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="habit-description-input"
                    className="block text-sm font-medium text-[var(--text)]"
                  >
                    Description <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {description.length}/280
                  </span>
                </div>
                <textarea
                  id="habit-description-input"
                  rows={2}
                  maxLength={280}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why this daily habit matters to you"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--bright)] focus:outline-none resize-none"
                />
              </div>

              {/* Cover image */}
              <div>
                <div className="text-sm font-medium text-[var(--text)] mb-1.5">
                  Cover image <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </div>
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--border)]">
                    <img
                      src={imageUrl}
                      alt="Selected habit cover"
                      width={640}
                      height={360}
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs hover:bg-black cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => void handleFileUpload(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--border)] bg-[var(--bg)] text-xs font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <ImagePlus size={14} />
                        {uploading ? 'Uploading...' : 'Upload image (max 2 MB)'}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)] mb-1.5">
                        Or use a suggested cover
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {SUGGESTED_COVERS.map((cov) => (
                          <button
                            key={cov.id}
                            type="button"
                            onClick={() => setImageUrl(cov.url)}
                            className="group relative rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--bright)] transition-colors cursor-pointer aspect-video"
                            title={`Use ${cov.label} cover`}
                          >
                            <img
                              src={cov.url}
                              alt={cov.label}
                              width={160}
                              height={90}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white py-0.5 text-center truncate px-1">
                              {cov.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reminder Time */}
              <div>
                <label
                  htmlFor="habit-reminder-time"
                  className="block text-sm font-medium text-[var(--text)]"
                >
                  Reminder time <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    id="habit-reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
                  />
                  {reminderTime && (
                    <button
                      type="button"
                      onClick={() => setReminderTime('')}
                      className="text-xs text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Reminders appear while GREENSTRIKE is open.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-sm font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-6 py-2.5 rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? editingHabit
                      ? 'Saving...'
                      : 'Creating...'
                    : editingHabit
                    ? 'Save changes'
                    : 'Create Habit'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
