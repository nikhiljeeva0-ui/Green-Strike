import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ThemeMode } from '../lib/types';

export function ProfileMenu() {
  const { user, profile, theme, setTheme, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Account';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'G';

  const handleTheme = async (next: ThemeMode) => {
    await setTheme(next);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Profile menu"
        className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 border border-[var(--border)] bg-[var(--card)] hover:border-[var(--text-muted)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={displayName}
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[var(--emerald)] text-white text-xs font-semibold flex items-center justify-center">
            {initial}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-medium text-[var(--text)] max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className="text-[var(--text-2)]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-2 z-50"
        >
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <div className="text-sm font-medium text-[var(--text)] truncate">
              {displayName}
            </div>
            {user?.email && (
              <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {user.email}
              </div>
            )}
          </div>

          <div className="py-1.5">
            <div className="px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1 px-2 mt-1">
              {(
                [
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => void handleTheme(item.id)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)]'
                        : 'text-[var(--text-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon size={12} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-1 mt-1 flex flex-col gap-0.5">
            <Link
              to="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
            >
              <Settings size={15} className="text-[var(--text-2)]" aria-hidden="true" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors w-full text-left cursor-pointer"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
