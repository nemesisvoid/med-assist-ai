'use server';

import { getSessionWithRole } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { getVideoAccess } from '@/lib/video-access';
import { createVideoToken, isVideoConfigured, liveKitUrl } from '@/lib/video';

const CALL_NOTIFICATION_DEDUP_MS = 10 * 60 * 1000;

const ACCESS_MESSAGES = {
  not_found: 'Appointment not found.',
  closed: 'This appointment is closed, so the video call is no longer available.',
  no_clinician: 'A clinician hasn’t been assigned to this appointment yet.',
} as const;

/**
 * Issues a one-hour LiveKit pass for this appointment's room to its patient or
 * assigned clinician, records the join in the audit log, and leaves the other
 * participant an in-app notification (in case they aren't online to see the
 * live "calling" notice).
 */
export const joinVideoCall = async (appointmentId: string) => {
  const session = await getSessionWithRole('PATIENT', 'DOCTOR');
  if (!session) return { success: false as const, message: 'Please sign in to continue.' };
  if (!isVideoConfigured()) return { success: false as const, message: 'Video calls are not set up on this server yet.' };

  try {
    const access = await getVideoAccess(String(appointmentId ?? ''), session.user.id);
    if (!access.ok) return { success: false as const, message: ACCESS_MESSAGES[access.reason] };

    const token = await createVideoToken({
      appointmentId: access.appointment.id,
      userId: session.user.id,
      displayName: access.selfName,
      role: access.isClinician ? 'clinician' : 'patient',
    });

    await recordAudit({
      actorId: session.user.id,
      action: 'VIDEO_CALL_JOINED',
      entityType: 'Appointment',
      entityId: access.appointment.id,
      summary: access.isClinician ? 'Clinician joined the video call' : 'Patient joined the video call',
    });

    const link = `/call/${access.appointment.id}`;
    const alreadyNotified = await prisma.notification.findFirst({
      where: { userId: access.partner.id, link, createdAt: { gte: new Date(Date.now() - CALL_NOTIFICATION_DEDUP_MS) } },
      select: { id: true },
    });
    if (!alreadyNotified) {
      await createNotification({
        userId: access.partner.id,
        type: 'APPOINTMENT',
        title: `${access.selfName} started a video call`,
        message: `${access.selfName} is waiting in the video call for your ${access.appointment.appointmentType} appointment.`,
        link,
      });
    }

    return { success: true as const, token, serverUrl: liveKitUrl() };
  } catch (error) {
    console.error('[joinVideoCall]', error);
    return { success: false as const, message: 'Could not start the video call. Please try again.' };
  }
};
