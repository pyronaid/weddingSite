/**
 * Shrinks a photo before upload: phone pictures are 3–8 MB, while 2048 px on
 * the long side (~0.5 MB as JPEG) is plenty for the gallery and saves the
 * guests' mobile data on the venue's network.
 *
 * Decoding honours the EXIF orientation. If the browser cannot decode the
 * file (e.g. HEIC outside Safari), the original is returned and the server
 * validates it.
 */
export async function resizeImage(file: Blob, maxSide = 2048, quality = 0.85): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
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
    // Keep the original if re-encoding failed or did not help.
    return blob && blob.size < file.size ? blob : file;
  } finally {
    bitmap.close();
  }
}
