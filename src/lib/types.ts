export type ThemeMode = 'dark' | 'light' | 'system';

export type UserProfile = {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string | null;
  theme: ThemeMode;
  remindersEnabled: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

export type Habit = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string; // 'lucide:<name>' or 'emoji:<char>'
  imageUrl: string | null;
  reminderTime: string | null; // 'HH:MM'
  sortOrder: number;
  createdAt: string; // ISO string
  archivedAt: string | null; // ISO string | null
};

export type HabitDraft = {
  name: string;
  description?: string | null;
  icon: string;
  imageUrl?: string | null;
  reminderTime?: string | null;
};

export const SUGGESTED_HABITS: Array<{ label: string; icon: string }> = [
  { label: 'Workout', icon: 'lucide:dumbbell' },
  { label: 'Startup work', icon: 'lucide:rocket' },
  { label: 'Business learning', icon: 'lucide:brain' },
  { label: 'College study', icon: 'lucide:book-open' },
  { label: 'Reading', icon: 'lucide:book-open' },
  { label: 'Running', icon: 'lucide:footprints' },
  { label: 'Meditation', icon: 'lucide:sparkles' },
  { label: 'Drink water', icon: 'lucide:droplets' },
  { label: 'Coding', icon: 'lucide:laptop' },
];
