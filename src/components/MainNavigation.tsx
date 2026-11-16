import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Home, ListChecks, Moon, Settings, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileMenu } from './ProfileMenu';

type MainNavigationProps = {
  variant: 'landing' | 'app';
};

export function BrandWordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 font-semibold tracking-[0.11em] sm:tracking-[0.16em] text-xs sm:text-sm text-[var(--text)] whitespace-nowrap shrink-0">
      <span
        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] bg-[var(--bright)] inline-block shrink-0"
        aria-hidden="true"
      />
      <span>GREENSTRIKE</span>
    </span>
  );
}

export function MainNavigation({ variant }: MainNavigationProps) {
  const { user, isDark, setTheme } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== 'landing') return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [variant]);

  if (variant === 'landing') {
    return (
      <header className="fixed top-4 inset-x-0 z-40 px-2.5 sm:px-4 pointer-events-none">
        <div
          className={`mx-auto max-w-[1200px] pointer-events-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-8 px-3 sm:px-4 md:px-6 h-14 rounded-full transition-all duration-200 ${
            scrolled
              ? 'bg-[var(--card)]/85 backdrop-blur-md border border-[var(--border)] shadow-sm'
              : 'bg-transparent border border-transparent'
          }`}
        >
          <Link to="/" aria-label="GREENSTRIKE home" className="shrink-0">
            <BrandWordmark />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-2)]"
          >
            <a
              href="#how-it-works"
              className="hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
            <a
              href="#the-calendar"
              className="hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0"
            >
              Calendar
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-11 h-11 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer shrink-0"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <Link
                to="/dashboard"
                className="px-3.5 sm:px-4 py-2 min-h-[44px] md:min-h-0 inline-flex items-center rounded-full bg-[var(--emerald)] text-white text-xs sm:text-sm font-medium hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?tab=login"
                  className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0"
                >
                  Log in
                </Link>
                <Link
                  to="/auth?tab=signup"
                  className="px-3 sm:px-4 py-2 min-h-[44px] md:min-h-0 inline-flex items-center rounded-full bg-[var(--emerald)] text-white text-[11px] sm:text-sm font-medium hover:brightness-110 transition-all whitespace-nowrap shrink-0"
                >
                  Start Your Journey
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/habits', label: 'My Habits', icon: ListChecks },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) =>
    path === '/habits'
      ? location.pathname.startsWith('/habits')
      : location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-6">
          <Link to="/dashboard" aria-label="GREENSTRIKE dashboard" className="shrink-0">
            <BrandWordmark />
          </Link>

          <nav
            aria-label="App navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[var(--text)] border-[var(--bright)]'
                      : 'text-[var(--text-2)] border-transparent hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (<768px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 min-h-[48px] text-[11px] font-medium transition-colors ${
                  active ? 'text-[var(--bright)]' : 'text-[var(--text-2)]'
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
