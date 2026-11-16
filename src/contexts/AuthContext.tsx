import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseAuthProfile,
  type User,
} from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth, googleAuthProvider } from '../lib/firebase';
import { ensureUserProfile, updateUserProfile } from '../lib/db';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode, UserProfile } from '../lib/types';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (next: ThemeMode) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileFields: (
    patch: Partial<
      Pick<UserProfile, 'displayName' | 'avatarUrl' | 'timezone' | 'theme' | 'remindersEnabled'>
    >
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled on this Firebase project. Please use Google Sign-In or enable Email/Password in Firebase Console.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in before changing your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const { theme, isDark, setTheme: setLocalTheme } = useTheme(profile?.theme);

  const loadProfile = useCallback(async (u: User) => {
    const fallback =
      u.displayName || (u.email ? u.email.split('@')[0] : 'Member');
    const p = await ensureUserProfile(u.uid, fallback);
    setProfile(p);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          await loadProfile(nextUser);
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      } else {
        setProfile(null);
        queryClient.clear();
      }
      setAuthReady(true);
    });
    return unsub;
  }, [loadProfile, queryClient]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await loadProfile(auth.currentUser);
  }, [loadProfile]);

  const updateProfileFields = useCallback(
    async (
      patch: Partial<
        Pick<
          UserProfile,
          'displayName' | 'avatarUrl' | 'timezone' | 'theme' | 'remindersEnabled'
        >
      >
    ) => {
      if (!auth.currentUser) throw new Error('Not signed in.');
      await updateUserProfile(auth.currentUser.uid, patch);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    },
    []
  );

  const setTheme = useCallback(
    async (next: ThemeMode) => {
      setLocalTheme(next);
      if (auth.currentUser) {
        await updateProfileFields({ theme: next });
      }
    },
    [setLocalTheme, updateProfileFields]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const clean = displayName.trim();
        if (clean) {
          await updateFirebaseAuthProfile(cred.user, { displayName: clean });
        }
        await ensureUserProfile(cred.user.uid, clean || email.split('@')[0]);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    []
  );

  const sendResetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        theme,
        isDark,
        setTheme,
        refreshProfile,
        updateProfileFields,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendResetPassword,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
