/**
 * Removes hidden metadata (EXIF: GPS location, camera, timestamps) from photos
 * before they leave the browser, by re-drawing the pixels onto a canvas and
 * encoding a fresh file. The photo's rotation is applied first, so it still
 * appears the right way up.
 *
 * Browser-only. GIFs are passed through unchanged: re-encoding would drop
 * their animation, and GIF has no EXIF block.
 */

const REENCODE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 4096; // also keeps very large phone photos to a sensible size
const JPEG_WEBP_QUALITY = 0.92;

export const needsMetadataStripping = (file: File) => REENCODE_TYPES.has(file.type);

/** Returns a metadata-free copy of the image. Throws if the image can't be processed. */
export async function stripImageMetadata(file: File): Promise<File> {
  if (!needsMetadataStripping(file)) return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, file.type, JPEG_WEBP_QUALITY));
    // Some browsers can't encode WebP and silently fall back to PNG; reject that so
    // the declared type always matches the bytes.
    if (!blob || blob.type !== file.type) throw new Error('Could not re-encode image');

    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
