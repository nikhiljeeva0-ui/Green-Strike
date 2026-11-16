import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getBrowserTimezone } from '../lib/dates';
import { uploadUserImage } from '../lib/storage';
import type { ThemeMode } from '../lib/types';

function getAllTimezones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    if (typeof intl.supportedValuesOf === 'function') {
      return intl.supportedValuesOf('timeZone');
    }
  } catch {
    // fallback
  }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];
}

export function SettingsPage() {
  const { user, profile, theme, setTheme, updateProfileFields, changePassword, logout } =
    useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tzQuery, setTzQuery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (profile?.displayName !== undefined) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  const allTimezones = useMemo(() => getAllTimezones(), []);
  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return allTimezones.slice(0, 60);
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 60);
  }, [allTimezones, tzQuery]);

  const currentTz = profile?.timezone || getBrowserTimezone();
  const hasPasswordProvider = Boolean(
    user?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      showToast('Display name cannot be empty.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateProfileFields({ displayName: trimmed });
      showToast('Display name saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save name.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserImage(file, user.uid, 'avatars');
      await updateProfileFields({ avatarUrl: url });
      showToast('Profile image updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Avatar upload failed.', 'error');
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfileFields({ avatarUrl: null });
      showToast('Profile image removed.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove image.', 'error');
    }
  };

  const handleThemeSelect = async (next: ThemeMode) => {
    try {
      await setTheme(next);
      showToast(`Theme set to ${next}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update theme.', 'error');
    }
  };

  const handleTimezoneSelect = async (tz: string) => {
    try {
      await updateProfileFields({ timezone: tz });
      showToast(`Timezone updated to ${tz}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update timezone.', 'error');
    }
  };

  const handleToggleReminders = async () => {
    const next = !Boolean(profile?.remindersEnabled);
    try {
      await updateProfileFields({ remindersEnabled: next });
      showToast(next ? 'In-app reminders enabled.' : 'In-app reminders turned off.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update reminders.', 'error');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setSavingPass(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not change password.', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-serif-editorial text-4xl sm:text-5xl text-[var(--text)] tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--text-2)]">
          Manage your profile, appearance, timezone, and reminders.
        </p>
      </div>

      {/* Display name & Avatar */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <form onSubmit={(e) => void handleSaveName(e)} className="space-y-2">
          <label
            htmlFor="settings-display-name"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Display name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="settings-display-name"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingName}
              className="px-5 py-2.5 rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {savingName ? 'Saving...' : 'Save name'}
            </button>
          </div>
        </form>

        <div className="pt-5 border-t border-[var(--border)]">
          <div className="text-sm font-medium text-[var(--text)] mb-3">
            Profile image
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName || 'Profile avatar'}
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[var(--emerald)] text-white text-lg font-semibold flex items-center justify-center">
                {(displayName || 'G').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleAvatarUpload(e)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-xs font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer"
            >
              <ImagePlus size={14} aria-hidden="true" />
              <span>{uploadingAvatar ? 'Uploading...' : 'Upload image'}</span>
            </button>
            {profile?.avatarUrl && (
              <button
                type="button"
                onClick={() => void handleRemoveAvatar()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] md:min-h-0 rounded-full border border-[var(--border)] bg-[var(--bg)] text-xs font-medium text-[var(--text-2)] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="text-sm font-medium text-[var(--text)]">Theme</div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Dark is default. Your choice is saved to your profile and synced immediately.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {(
            [
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Monitor },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => void handleThemeSelect(opt.id)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--bg-2)] border-[var(--bright)] text-[var(--text)]'
                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Timezone */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[var(--text)]">Timezone</div>
            <div className="text-xs text-[var(--text-2)] mt-0.5">
              Active: <span className="font-medium text-[var(--text)]">{currentTz}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleTimezoneSelect(getBrowserTimezone())}
            className="text-xs text-[var(--bright)] hover:underline cursor-pointer whitespace-nowrap"
          >
            Use browser timezone
          </button>
        </div>

        <div>
          <label htmlFor="tz-search" className="sr-only">
            Search timezone
          </label>
          <input
            id="tz-search"
            type="text"
            value={tzQuery}
            onChange={(e) => setTzQuery(e.target.value)}
            placeholder="Search timezone (e.g. Asia/Kolkata, America/New_York)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
          />
        </div>

        <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] divide-y divide-[var(--border)]">
          {filteredTimezones.map((tz) => {
            const active = tz === currentTz;
            return (
              <button
                key={tz}
                type="button"
                onClick={() => void handleTimezoneSelect(tz)}
                className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--bg-2)] text-[var(--bright)] font-medium'
                    : 'text-[var(--text)] hover:bg-[var(--bg-2)]'
                }`}
              >
                <span>{tz}</span>
                {active && <span className="text-xs">Selected</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reminders */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--text)]">
            In-app reminders
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Reminders appear while GREENSTRIKE is open. Per-habit times live inside each habit.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(profile?.remindersEnabled)}
          aria-label="Toggle in-app reminders"
          onClick={() => void handleToggleReminders()}
          className={`w-12 h-7 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
            profile?.remindersEnabled ? 'bg-[var(--emerald)]' : 'bg-[var(--cell-empty)]'
          }`}
        >
          <span
            className={`block w-6 h-6 rounded-full bg-white transition-transform ${
              profile?.remindersEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </section>

      {/* Account */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 space-y-5">
        <div>
          <div className="text-sm font-medium text-[var(--text)]">Account</div>
          <div className="mt-1 text-sm text-[var(--text-2)]">
            {user?.email || 'Signed in'}
          </div>
        </div>

        {hasPasswordProvider && (
          <form
            onSubmit={(e) => void handlePasswordSubmit(e)}
            className="pt-4 border-t border-[var(--border)] space-y-2.5"
          >
            <label
              htmlFor="settings-new-password"
              className="block text-xs font-medium text-[var(--text-2)]"
            >
              Change password
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingPass}
                className="px-5 py-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-sm font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {savingPass ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-sm font-medium text-[var(--text)] hover:border-red-500/50 hover:text-red-500 transition-colors cursor-pointer"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
