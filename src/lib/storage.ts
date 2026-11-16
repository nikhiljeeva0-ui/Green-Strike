import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { MAX_IMAGE_BYTES, validateImageFile } from './imageValidation';

export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, validateImageFile } from './imageValidation';

export const LANDING_IMAGES = {
  heroForest: '/src/assets/images/hero_forest_1794805774992.jpg',
  bandLeaves: '/src/assets/images/band_leaves_1794805775194.jpg',
} as const;

export const SUGGESTED_COVERS = [
  {
    id: 'workout',
    label: 'Workout',
    url: '/src/assets/images/habit_workout_1794805776165.jpg',
  },
  {
    id: 'startup',
    label: 'Startup',
    url: '/src/assets/images/habit_startup_1794805776106.jpg',
  },
  {
    id: 'learning',
    label: 'Learning',
    url: '/src/assets/images/habit_learning_1794805777086.jpg',
  },
  {
    id: 'reading',
    label: 'Reading',
    url: '/src/assets/images/habit_reading_1794805776825.jpg',
  },
] as const;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image.'));
    };
    img.src = objectUrl;
  });
}

async function resizeImage(
  file: File,
  maxWidth: number
): Promise<{ blob: Blob; dataUrl: string }> {
  const img = await loadImage(file);
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image processing is unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  const mime = 'image/webp';
  const quality = 0.78;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to encode image.'));
      },
      mime,
      quality
    );
  });

  const dataUrl = canvas.toDataURL(mime, quality);
  return { blob, dataUrl };
}

export async function uploadUserImage(
  file: File,
  userId: string,
  bucket: 'avatars' | 'habit-covers'
): Promise<string> {
  validateImageFile(file);

  const maxWidth = bucket === 'avatars' ? 512 : 1600;
  const { blob, dataUrl } = await resizeImage(file, maxWidth);
  if (blob.size >= MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 2 MB.');
  }

  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const objectRef = ref(storage, `users/${userId}/${bucket}/${uuid}.webp`);
    await uploadBytes(objectRef, blob, { contentType: 'image/webp' });
    return await getDownloadURL(objectRef);
  } catch {
    // Graceful inline fallback if Storage rules/bucket are not provisioned yet,
    // staying well below Firestore's 500 KB field cap.
    if (dataUrl.length <= 450_000) {
      return dataUrl;
    }
    const { dataUrl: smaller } = await resizeImage(file, 800);
    if (smaller.length <= 450_000) {
      return smaller;
    }
    throw new Error('Image upload failed. Please try a smaller file.');
  }
}
