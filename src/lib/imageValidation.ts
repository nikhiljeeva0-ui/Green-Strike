export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Matches storage.rules: request.resource.size < 2 * 1024 * 1024
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file: { type: string; size: number }): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }
  if (file.size >= MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 2 MB.');
  }
}
