import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { MainNavigation } from './MainNavigation';
import { ReminderBanner } from './ReminderBanner';

export function ProtectedLayout() {
  const { user, authReady } = useAuth();
  const location = useLocation();
  const reduced = useReducedMotion();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-[var(--bright)]/20 border border-[var(--bright)]/40 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-24 md:pb-12">
      <MainNavigation variant="app" />
      <ReminderBanner />
      <motion.main
        key={location.pathname}
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-6 sm:pt-10"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
