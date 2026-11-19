/**
 * Deletes chat uploads that were never sent. A file that was picked but never
 * attached to a message isn't part of anyone's record, so it shouldn't be kept.
 *
 * Server-only. Runs daily from /api/cron/cleanup-attachments and, per user,
 * whenever that user starts a new upload.
 */

import { prisma } from '@/lib/prisma';
import { deleteObjects, isStorageConfigured } from '@/lib/storage';

export const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

/** Returns how many stale uploads were deleted. Storage is cleaned before the rows, so nothing is orphaned. */
export async function cleanupStaleUploads({ uploaderId, maxBatches = 20 }: { uploaderId?: string; maxBatches?: number } = {}): Promise<number> {
  if (!isStorageConfigured()) return 0;
  const cutoff = new Date(Date.now() - STALE_UPLOAD_MS);
  let deleted = 0;

  for (let batch = 0; batch < maxBatches; batch++) {
    const stale = await prisma.messageAttachment.findMany({
      where: { messageId: null, createdAt: { lt: cutoff }, ...(uploaderId ? { uploaderId } : {}) },
      select: { id: true, storageKey: true },
      take: BATCH_SIZE,
    });
    if (stale.length === 0) break;

    await deleteObjects(stale.map(a => a.storageKey));
    // messageId: null again, in case one was sent between the read and the delete.
    const { count } = await prisma.messageAttachment.deleteMany({
      where: { id: { in: stale.map(a => a.id) }, messageId: null },
    });
    deleted += count;
    if (stale.length < BATCH_SIZE) break;
  }
  return deleted;
}
