import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandWordmark } from '../components/MainNavigation';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 text-center">
      <BrandWordmark />
      <h1 className="mt-8 font-serif-editorial text-5xl sm:text-6xl text-[var(--text)]">
        Page not found
      </h1>
      <p className="mt-3 text-sm sm:text-base text-[var(--text-2)] max-w-md">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to={user ? '/dashboard' : '/'}
        className="mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all"
      >
        {user ? 'Back to dashboard' : 'Back to home'}
      </Link>
    </div>
  );
}
