/**
 * Chat attachment rules shared by the browser, the Next.js server and the
 * socket server. Plain module with no server-only imports.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed file types (by MIME type) and the label shown to users. */
export const ATTACHMENT_TYPES: Record<string, string> = {
  'image/jpeg': 'JPEG image',
  'image/png': 'PNG image',
  'image/webp': 'WebP image',
  'image/gif': 'GIF image',
  'application/pdf': 'PDF document',
  'text/plain': 'Text file',
  'application/msword': 'Word document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
};

export const IMAGE_ACCEPT = Object.keys(ATTACHMENT_TYPES).filter(t => t.startsWith('image/')).join(',');
export const FILE_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(',');

export type AttachmentInfo = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export const isAllowedAttachmentType = (mimeType: string) => Object.prototype.hasOwnProperty.call(ATTACHMENT_TYPES, mimeType);
export const isImageAttachment = (mimeType: string) => mimeType.startsWith('image/');

/** Returns an error message, or null if the file can be attached. */
export function validateAttachment(file: { type: string; size: number }): string | null {
  if (!isAllowedAttachmentType(file.type)) return 'This file type is not supported. Share images, PDFs, Word or text files.';
  if (file.size <= 0) return 'This file is empty.';
  if (file.size > MAX_ATTACHMENT_BYTES) return `Files must be ${formatFileSize(MAX_ATTACHMENT_BYTES)} or smaller.`;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Keeps a display name only: no paths, control characters or overly long names. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|]/g, '').trim();
  return (cleaned || 'file').slice(0, 120);
}
