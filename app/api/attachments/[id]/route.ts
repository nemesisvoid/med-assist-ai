import { NextResponse, type NextRequest } from 'next/server';
import { getLoggedInUser } from '@/lib/get-user';
import { prisma } from '@/lib/prisma';
import { isImageAttachment } from '@/lib/attachments';
import { createDownloadUrl, isStorageConfigured } from '@/lib/storage';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };

/** Repeat views by the same person within this window aren't logged again (images re-load as a chat scrolls). */
const VIEW_LOG_DEDUP_MS = 10 * 60 * 1000;
const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: noStore });

/**
 * Opens a chat attachment. Only the two participants of the conversation can
 * open it (admins can't: they have no clinical need). The response is a
 * redirect to a 60-second signed storage URL, so links can't be shared or reused.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getLoggedInUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: noStore });
  if (!isStorageConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503, headers: noStore });

  const { id } = await params;
  const attachment = await prisma.messageAttachment.findUnique({
    where: { id },
    select: {
      conversationId: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      messageId: true,
      uploaderId: true,
      conversation: { select: { patientId: true, doctorId: true } },
    },
  });

  const userId = session.user.id;
  const isParticipant = !!attachment && (attachment.conversation.patientId === userId || attachment.conversation.doctorId === userId);
  // An upload that was never sent is only visible to the person who uploaded it.
  const isVisible = !!attachment && (attachment.messageId !== null || attachment.uploaderId === userId);
  if (!attachment || !isParticipant || !isVisible) return notFound();

  // Access log, like full patient-record views. The file name is left out on purpose:
  // it can itself reveal health information (e.g. "hiv-test-result.pdf").
  const recentlyLogged = await prisma.auditLog.findFirst({
    where: { actorId: userId, action: 'ATTACHMENT_VIEWED', entityId: id, createdAt: { gte: new Date(Date.now() - VIEW_LOG_DEDUP_MS) } },
    select: { id: true },
  });
  if (!recentlyLogged) {
    await recordAudit({
      actorId: userId,
      action: 'ATTACHMENT_VIEWED',
      entityType: 'MessageAttachment',
      entityId: id,
      summary: `Opened a chat attachment (${attachment.mimeType})`,
      metadata: { conversationId: attachment.conversationId, mimeType: attachment.mimeType },
    });
  }

  const forceDownload = req.nextUrl.searchParams.get('download') === '1';
  const url = await createDownloadUrl(attachment.storageKey, {
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    inline: !forceDownload && isImageAttachment(attachment.mimeType),
  });

  return NextResponse.redirect(url, { status: 302, headers: noStore });
}
