import { messagesOf } from '../i18n';
import { preparePhotoMessages } from './preparePhotoMessages';

/** Raised when the chosen file is not a usable photo: the message is shown as is. */
export class PhotoCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoCheckError';
  }
}

/** Formats the server accepts (it checks the real file content too). */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Smaller than this is an icon or a thumbnail, not a photo of a scene. */
export const MIN_PHOTO_SIDE = 320;

/**
 * Checks that a file is a real photo and prepares it for upload:
 * - rejects anything that is not an image (documents, videos...) or cannot
 *   be decoded as one, and images too small to show a scene;
 * - shrinks it to `maxSide` px on the long side (phone photos are 3–8 MB,
 *   ~0.5 MB is plenty for the gallery and saves mobile data at the venue);
 * - re-encodes it as JPEG, which also drops the EXIF metadata (GPS location,
 *   phone model) before the photo is shared with every guest.
 *
 * Decoding honours the EXIF orientation. If the browser cannot decode a
 * format the server accepts, the original is sent and the server decides.
 */
export async function preparePhoto(file: File, maxSide = 2048, quality = 0.85): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new PhotoCheckError(messagesOf(preparePhotoMessages).notAPhoto);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (ACCEPTED_TYPES.includes(file.type)) return file;
    throw new PhotoCheckError(messagesOf(preparePhotoMessages).unsupported);
  }

  try {
    if (Math.min(bitmap.width, bitmap.height) < MIN_PHOTO_SIDE) {
      throw new PhotoCheckError(messagesOf(preparePhotoMessages).tooSmall(MIN_PHOTO_SIDE));
    }

    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}
