import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BrandWordmark } from '../components/MainNavigation';

export function AuthPage() {
  const { user, authReady, signInWithGoogle, signInWithEmail, signUpWithEmail, sendResetPassword } =
    useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const [tab, setTab] = useState<'login' | 'signup' | 'reset'>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authReady && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authReady, user, navigate]);

  const switchTab = (next: 'login' | 'signup' | 'reset') => {
    setTab(next);
    setError(null);
    setInfoMsg(null);
    if (next === 'login' || next === 'signup') {
      setSearchParams({ tab: next }, { replace: true });
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (tab === 'reset') {
      setSubmitting(true);
      try {
        await sendResetPassword(trimmedEmail);
        setInfoMsg('If an account exists for that email, a password reset link has been sent.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send reset email.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (tab === 'signup' && !displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await signUpWithEmail(trimmedEmail, password, displayName.trim());
        showToast('Welcome to GREENSTRIKE.', 'success');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between px-4 py-8">
      <div className="mx-auto max-w-[1200px] w-full flex items-center justify-between">
        <Link to="/" aria-label="Back to GREENSTRIKE home">
          <BrandWordmark />
        </Link>
        <Link
          to="/"
          className="text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
        >
          Back to home
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md my-10">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl">
          <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[var(--text)]">
            {tab === 'signup'
              ? 'Start your journey.'
              : tab === 'reset'
              ? 'Reset password.'
              : 'Welcome back.'}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-2)]">
            Every day counts. Sign in to keep your habits synced across devices.
          </p>

          {tab !== 'reset' && (
            <>
              <div className="mt-6 grid grid-cols-2 p-1 rounded-full bg-[var(--bg-2)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    tab === 'login'
                      ? 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                      : 'text-[var(--text-2)] hover:text-[var(--text)] border border-transparent'
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    tab === 'signup'
                      ? 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                      : 'text-[var(--text-2)] hover:text-[var(--text)] border border-transparent'
                  }`}
                >
                  Sign up
                </button>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleGoogle()}
                className="mt-5 w-full flex items-center justify-center gap-2.5 px-5 py-3 min-h-[48px] rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-muted)]">or with email</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-medium text-[var(--text-2)]"
                >
                  Display name
                </label>
                <input
                  id="auth-display-name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-[var(--text-2)]"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
              />
            </div>

            {tab !== 'reset' && (
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-[var(--text-2)]"
                  >
                    Password
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchTab('reset')}
                      className="text-xs text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:border-[var(--bright)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                {error}
              </p>
            )}
            {infoMsg && (
              <p role="status" className="text-xs text-[var(--bright)] leading-relaxed">
                {infoMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-sm font-medium text-[var(--text)] hover:border-[var(--text-2)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : tab === 'signup'
                ? 'Create account with email'
                : tab === 'reset'
                ? 'Send reset link'
                : 'Log in with email'}
            </button>

            {tab === 'reset' && (
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="w-full text-center text-xs text-[var(--text-2)] hover:text-[var(--text)] py-1 cursor-pointer"
              >
                Back to Log in
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="text-center text-xs text-[var(--gold)]">
        Created by Nikhil Jeeva
      </div>
    </div>
  );
}
