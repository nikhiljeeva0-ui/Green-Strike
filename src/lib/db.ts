import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getBrowserTimezone, isValidDateKey, type DateKey } from './dates';
import {
  COMPLETION_PAGE_SIZE,
  DELETE_BATCH_SIZE,
  MAX_ACTIVE_HABITS,
  deleteHabitAndCompletionsWithStore,
  fetchAllCompletionDatesPaginated,
  normalizeReminderTime,
} from './dbOps';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { Habit, HabitDraft, ThemeMode, UserProfile } from './types';

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

export async function ensureUserProfile(
  uid: string,
  fallbackDisplayName: string | null
): Promise<UserProfile> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const currentTz = typeof data.timezone === 'string' && data.timezone ? data.timezone : null;
      if (!currentTz) {
        const browserTz = getBrowserTimezone();
        await updateDoc(ref, {
          timezone: browserTz,
          updatedAt: serverTimestamp(),
        });
        return {
          uid,
          displayName: String(data.displayName || fallbackDisplayName || 'Member'),
          avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
          timezone: browserTz,
          theme: (data.theme as ThemeMode) || 'dark',
          remindersEnabled: Boolean(data.remindersEnabled),
          createdAt: tsToIso(data.createdAt),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        uid,
        displayName: String(data.displayName || fallbackDisplayName || 'Member'),
        avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
        timezone: currentTz,
        theme: (data.theme as ThemeMode) || 'dark',
        remindersEnabled: Boolean(data.remindersEnabled),
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
      };
    }

    const browserTz = getBrowserTimezone();
    const cleanName = (fallbackDisplayName || 'Member').trim().slice(0, 80) || 'Member';
    await setDoc(ref, {
      uid,
      displayName: cleanName,
      avatarUrl: null,
      timezone: browserTz,
      theme: 'dark',
      remindersEnabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      uid,
      displayName: cleanName,
      avatarUrl: null,
      timezone: browserTz,
      theme: 'dark',
      remindersEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl' | 'timezone' | 'theme' | 'remindersEnabled'>>
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.displayName !== undefined) {
    const trimmed = patch.displayName.trim();
    if (!trimmed || trimmed.length > 80) {
      throw new Error('Display name must be between 1 and 80 characters.');
    }
    payload.displayName = trimmed;
  }
  if (patch.avatarUrl !== undefined) {
    payload.avatarUrl = patch.avatarUrl;
  }
  if (patch.timezone !== undefined) {
    payload.timezone = patch.timezone;
  }
  if (patch.theme !== undefined) {
    payload.theme = patch.theme;
  }
  if (patch.remindersEnabled !== undefined) {
    payload.remindersEnabled = patch.remindersEnabled;
  }

  try {
    await updateDoc(ref, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fetchHabits(userId: string): Promise<Habit[]> {
  const path = `users/${userId}/habits`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'habits'));
    const list: Habit[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId),
        name: String(data.name),
        description: data.description ? String(data.description) : null,
        icon: String(data.icon || 'lucide:sprout'),
        imageUrl: data.imageUrl ? String(data.imageUrl) : null,
        reminderTime: data.reminderTime ? String(data.reminderTime) : null,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
        createdAt: tsToIso(data.createdAt),
        archivedAt: data.archivedAt ? tsToIso(data.archivedAt) : null,
      };
    });

    list.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createHabit(userId: string, draft: HabitDraft): Promise<Habit> {
  const name = draft.name.trim();
  if (!name || name.length > 60) {
    throw new Error('Habit name must be between 1 and 60 characters.');
  }
  const description = draft.description?.trim() ? draft.description.trim().slice(0, 280) : null;
  const existingHabits = await fetchHabits(userId);
  const activeCount = existingHabits.filter((h) => h.archivedAt === null).length;
  if (activeCount >= MAX_ACTIVE_HABITS) {
    throw new Error('Active habit limit (30) reached. Archive or delete a habit first.');
  }
  const nextSortOrder =
    existingHabits.length > 0
      ? Math.max(...existingHabits.map((h) => h.sortOrder)) + 1
      : 0;
  const reminderTime = normalizeReminderTime(draft.reminderTime);

  const colRef = collection(db, 'users', userId, 'habits');
  const newDocRef = doc(colRef);
  const path = `users/${userId}/habits/${newDocRef.id}`;

  const docPayload = {
    id: newDocRef.id,
    userId,
    name,
    description,
    icon: draft.icon || 'lucide:sprout',
    imageUrl: draft.imageUrl || null,
    reminderTime,
    sortOrder: nextSortOrder,
    createdAt: serverTimestamp(),
    archivedAt: null,
  };

  try {
    await setDoc(newDocRef, docPayload);
    return {
      ...docPayload,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateHabit(
  userId: string,
  habitId: string,
  draft: HabitDraft
): Promise<void> {
  const name = draft.name.trim();
  if (!name || name.length > 60) {
    throw new Error('Habit name must be between 1 and 60 characters.');
  }
  const description = draft.description?.trim() ? draft.description.trim().slice(0, 280) : null;
  const reminderTime = normalizeReminderTime(draft.reminderTime);
  const path = `users/${userId}/habits/${habitId}`;
  const ref = doc(db, 'users', userId, 'habits', habitId);

  try {
    await updateDoc(ref, {
      name,
      description,
      icon: draft.icon || 'lucide:sprout',
      imageUrl: draft.imageUrl ?? null,
      reminderTime,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function setHabitArchived(
  userId: string,
  habitId: string,
  archive: boolean
): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  const ref = doc(db, 'users', userId, 'habits', habitId);

  if (!archive) {
    const existing = await fetchHabits(userId);
    const activeCount = existing.filter((h) => h.archivedAt === null && h.id !== habitId).length;
    if (activeCount >= MAX_ACTIVE_HABITS) {
      throw new Error('Active habit limit (30) reached. Archive or delete another habit first.');
    }
  }

  try {
    await updateDoc(ref, {
      archivedAt: archive ? serverTimestamp() : null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteHabitAndCompletions(
  userId: string,
  habitId: string
): Promise<number> {
  const completionsCol = collection(db, 'users', userId, 'habits', habitId, 'completions');
  const basePath = `users/${userId}/habits/${habitId}`;

  try {
    return await deleteHabitAndCompletionsWithStore(
      {
        fetchCompletionIdsBatch: async (batchLimit) => {
          const q = query(completionsCol, limit(batchLimit));
          const snap = await getDocs(q);
          return snap.docs.map((d) => d.id);
        },
        deleteCompletionIdsBatch: async (ids) => {
          const batch = writeBatch(db);
          for (const id of ids) {
            batch.delete(doc(completionsCol, id));
          }
          await batch.commit();
        },
        deleteHabitDoc: async () => {
          await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
        },
      },
      DELETE_BATCH_SIZE
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, basePath);
  }
}

/**
 * Fetches ALL completions for ONE habit using explicit pagination (page size 500)
 * so users with >1000 completions load completely without truncation.
 */
export async function fetchHabitCompletions(
  userId: string,
  habitId: string
): Promise<Set<DateKey>> {
  const path = `users/${userId}/habits/${habitId}/completions`;
  const completionsCol = collection(db, 'users', userId, 'habits', habitId, 'completions');

  try {
    return await fetchAllCompletionDatesPaginated<QueryDocumentSnapshot<DocumentData>>(
      async (cursor, pageSize) => {
        const q: Query<DocumentData> = cursor
          ? query(
              completionsCol,
              orderBy(documentId()),
              startAfter(cursor),
              limit(pageSize)
            )
          : query(
              completionsCol,
              orderBy(documentId()),
              limit(pageSize)
            );

        const snap: QuerySnapshot<DocumentData> = await getDocs(q);
        return {
          items: snap.docs.map((docSnap) => ({
            id: docSnap.id,
            completionDate: docSnap.data().completionDate,
          })),
          lastCursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
      },
      COMPLETION_PAGE_SIZE
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function toggleHabitCompletion(
  userId: string,
  habitId: string,
  dateKey: DateKey,
  nextValue: boolean,
  today: DateKey
): Promise<void> {
  if (!isValidDateKey(dateKey)) {
    throw new Error('Invalid date format.');
  }
  if (dateKey > today) {
    throw new Error("Future dates can't be completed.");
  }

  const path = `users/${userId}/habits/${habitId}/completions/${dateKey}`;
  const docRef = doc(db, 'users', userId, 'habits', habitId, 'completions', dateKey);

  try {
    if (nextValue) {
      await setDoc(docRef, {
        userId,
        habitId,
        completionDate: dateKey,
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(docRef);
    }
  } catch (err) {
    handleFirestoreError(
      err,
      nextValue ? OperationType.CREATE : OperationType.DELETE,
      path
    );
  }
}
