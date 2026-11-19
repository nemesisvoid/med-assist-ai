'use server'

import { randomUUID } from 'node:crypto';
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from '@/lib/authz';
import { MESSAGE_DELETE_WINDOW_MS, MESSAGING_ALLOWED_STATUSES } from '@/lib/messaging-constants';
import { sanitizeFileName, validateAttachment, type AttachmentInfo } from '@/lib/attachments';
import { createUploadUrl, deleteObjects, getObjectSize, isStorageConfigured } from '@/lib/storage';
import { recordAudit } from '@/lib/audit';
import { cleanupStaleUploads } from '@/lib/attachment-cleanup';
import { after } from 'next/server';

/*
 * Messaging server actions. Each one works only on conversations the signed-in
 * user is part of; the user is taken from the session, never from arguments.
 */

/** Appointment statuses that allow opening a conversation (matches the start-conversation dialog). */
const CONVERSATION_EXCLUDED_STATUSES = ['CANCELLED', 'PENDING_INTAKE', 'COMPLETED'] as const;

// ─── getPatientMessages ─────────────────────────────────────────────────────────

export const getPatientMessages = async () => {
    const session = await getSessionWithRole('PATIENT');
    if (!session) return { success: false, message: 'Not signed in', data: undefined };
    const patientId = session.user.id;
    try {
        const conversations = await prisma.conversation.findMany({
            where: { patientId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        appointment: {
                            select: { id: true, status: true, appointmentType: true, scheduledAt: true },
                        },
                        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
                    },
                },
                doctor: {
                    select: {
                        name: true,
                        image: true,
                        doctorProfile: { select: { specialty: true, imageUrl: true } },
                    },
                },
                activeAppointment: {
                    select: { id: true, status: true, appointmentType: true, scheduledAt: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return { success: true, data: conversations };
    } catch (error) {
        console.error('[getPatientMessages]', error);
        return { success: false, message: 'Something went wrong', data: undefined };
    }
};

// ─── getDoctorMessages ─────────────────────────────────────────────────────────

export const getDoctorMessages = async () => {
    const session = await getSessionWithRole('DOCTOR');
    if (!session) return { success: false, message: 'Not signed in', data: undefined };
    const doctorId = session.user.id;
    try {
        const conversations = await prisma.conversation.findMany({
            where: { doctorId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        appointment: {
                            select: { id: true, status: true, appointmentType: true, scheduledAt: true },
                        },
                        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
                    },
                },
                patient: {
                    select: {
                        name: true,
                        image: true,
                        patientProfile: { select: { imageUrl: true } },
                    },
                },
                activeAppointment: {
                    select: { id: true, status: true, appointmentType: true, scheduledAt: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return { success: true, data: conversations };
    } catch (error) {
        console.error('[getDoctorMessages]', error);
        return { success: false, message: 'Something went wrong', data: undefined };
    }
};

// ─── getAppointmentsForConversation ────────────────────────────────────────────
/**
 * Fetches appointments eligible for messaging.
 * For the "Start / Open Conversation" dialog.
 *
 * - Excludes CANCELLED, PENDING_INTAKE, COMPLETED
 * - Returns the existing conversationId for this patient-doctor pair (if any)
 *   so the dialog can navigate to it rather than create a duplicate.
 */
export const getAppointmentsForConversation = async () => {
    const session = await getSessionWithRole('PATIENT', 'DOCTOR');
    if (!session) return { success: false, message: 'Not signed in', data: [], hasPendingIntake: false };
    const userId = session.user.id;
    try {
        const isPatient = session.user.role === 'PATIENT';

        // Map: partnerId → existing conversationId (one per pair)
        const existingConversations = await prisma.conversation.findMany({
            where: isPatient ? { patientId: userId } : { doctorId: userId },
            select: {
                id: true,
                doctorId: true,
                patientId: true,
                activeAppointmentId: true,
            },
        });
        const partnerConversationMap = new Map<string, { convId: string; activeApptId: string | null }>(
            existingConversations.map(c => [
                isPatient ? c.doctorId : c.patientId,
                { convId: c.id, activeApptId: c.activeAppointmentId },
            ])
        );

        const appointments = await prisma.appointment.findMany({
            where: {
                ...(isPatient ? { patientId: userId, doctorId: { not: null } } : { doctorId: userId }),
                status: { notIn: [...CONVERSATION_EXCLUDED_STATUSES] },
            },
            include: {
                doctor: {
                    select: {
                        id: true, name: true, image: true,
                        doctorProfile: { select: { specialty: true, imageUrl: true } },
                    },
                },
                patient: {
                    select: {
                        id: true, name: true, image: true,
                        patientProfile: { select: { imageUrl: true } },
                    },
                },
            },
            orderBy: { scheduledAt: 'asc' },
        });

        // Check for pending intake appointments (informational, for empty-state message)
        const hasPendingIntake = isPatient
            ? (await prisma.appointment.count({ where: { patientId: userId, status: 'PENDING_INTAKE' } })) > 0
            : false;

        // Deduplicate by partner — one entry per doctor/patient, earliest upcoming appointment
        const seenPartners = new Set<string>();
        const normalized = appointments
            .filter(appt => {
                const partnerId = isPatient ? appt.doctor?.id : appt.patient.id;
                if (!partnerId || seenPartners.has(partnerId)) return false;
                seenPartners.add(partnerId);
                return true;
            })
            .map(appt => {
                const partnerId = isPatient ? appt.doctor?.id : appt.patient.id;
                const existing = partnerId ? partnerConversationMap.get(partnerId) : undefined;
                return {
                    id: appt.id,
                    appointmentType: appt.appointmentType,
                    appointmentReason: appt.appointmentReason,
                    scheduledAt: appt.scheduledAt,
                    scheduledTime: appt.scheduledTime,
                    status: appt.status,
                    // If a conversation already exists for this partner, expose it
                    existingConversationId: existing?.convId ?? null,
                    partner: isPatient
                        ? { id: appt.doctor?.id, name: appt.doctor?.name, image: appt.doctor?.image, specialty: appt.doctor?.doctorProfile?.specialty, imageUrl: appt.doctor?.doctorProfile?.imageUrl }
                        : { id: appt.patient.id, name: appt.patient.name, image: appt.patient.image, specialty: 'Patient', imageUrl: appt.patient.patientProfile?.imageUrl },
                };
            });

        return { success: true, data: normalized, hasPendingIntake };
    } catch (error) {
        console.error('[getAppointmentsForConversation]', error);
        return { success: false, message: 'Something went wrong', data: [], hasPendingIntake: false };
    }
};

// ─── createOrOpenConversation ──────────────────────────────────────────────────
/**
 * Opens (or creates) the conversation for an appointment the caller is part of.
 * The patient-doctor pair comes from the appointment itself, so a caller can't
 * open a conversation between arbitrary users.
 *
 * Uses @@unique([patientId, doctorId]) under the hood.
 */
export const createOrOpenConversation = async ({ appointmentId }: { appointmentId: string }) => {
    const session = await getSessionWithRole('PATIENT', 'DOCTOR');
    if (!session) return { success: false, message: 'Please sign in to continue.' };
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { patientId: true, doctorId: true, status: true },
        });
        const isParticipant =
            !!appointment && (appointment.patientId === session.user.id || appointment.doctorId === session.user.id);
        if (!appointment || !appointment.doctorId || !isParticipant) {
            return { success: false, message: 'Appointment not found.' };
        }
        if ((CONVERSATION_EXCLUDED_STATUSES as readonly string[]).includes(appointment.status)) {
            return { success: false, message: 'Messaging is not available for this appointment.' };
        }

        const { patientId, doctorId } = appointment;
        const conversation = await prisma.conversation.upsert({
            where: { patientId_doctorId: { patientId, doctorId } },
            create: { patientId, doctorId, activeAppointmentId: appointmentId },
            update: { activeAppointmentId: appointmentId },
        });

        return { success: true, data: conversation };
    } catch (error) {
        console.error('[createOrOpenConversation]', error);
        return { success: false, message: 'Failed to create or open conversation' };
    }
};

// ─── Attachments ──────────────────────────────────────────────────────────────
/*
 * Upload flow: createAttachmentUpload → browser PUTs the file to the signed URL
 * → confirmAttachmentUpload → the socket server links the confirmed attachment
 * to the message the user sends.
 */

const MAX_PENDING_UPLOADS_PER_HOUR = 30;

/** The conversation if the user is a participant and messaging is currently open in it. */
async function getWritableConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, OR: [{ patientId: userId }, { doctorId: userId }] },
        select: { id: true, activeAppointmentId: true, chatLocksAt: true, activeAppointment: { select: { status: true } } },
    });
    if (!conversation?.activeAppointmentId) return null;
    if (conversation.chatLocksAt && new Date() > conversation.chatLocksAt) return null;
    const status = conversation.activeAppointment?.status;
    if (!status || !(MESSAGING_ALLOWED_STATUSES as readonly string[]).includes(status)) return null;
    return conversation;
}

export const createAttachmentUpload = async (input: { conversationId: string; fileName: string; mimeType: string; size: number }) => {
    const session = await getSessionWithRole('PATIENT', 'DOCTOR');
    if (!session) return { success: false as const, message: 'Please sign in to continue.' };
    if (!isStorageConfigured()) return { success: false as const, message: 'File sharing is not set up on this server yet.' };

    const invalid = validateAttachment({ type: String(input?.mimeType ?? ''), size: Number(input?.size ?? 0) });
    if (invalid) return { success: false as const, message: invalid };

    try {
        const conversation = await getWritableConversation(String(input.conversationId ?? ''), session.user.id);
        if (!conversation) return { success: false as const, message: 'You can’t share files in this conversation.' };

        const recent = await prisma.messageAttachment.count({
            where: { uploaderId: session.user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        });
        if (recent >= MAX_PENDING_UPLOADS_PER_HOUR) {
            return { success: false as const, message: 'You’ve shared a lot of files recently. Please try again later.' };
        }

        // The storage key never contains the user's file name.
        const storageKey = `conversations/${conversation.id}/${randomUUID()}`;
        const attachment = await prisma.messageAttachment.create({
            data: {
                conversationId: conversation.id,
                uploaderId: session.user.id,
                storageKey,
                fileName: sanitizeFileName(input.fileName),
                mimeType: input.mimeType,
                size: input.size,
            },
            select: { id: true },
        });
        const uploadUrl = await createUploadUrl(storageKey, input.mimeType, input.size);
        // Also clear this user's own uploads that were never sent (works even without the daily cron).
        const uploaderId = session.user.id;
        after(() => cleanupStaleUploads({ uploaderId, maxBatches: 1 }).catch(error => console.error('[attachments] cleanup failed:', error)));
        return { success: true as const, attachmentId: attachment.id, uploadUrl };
    } catch (error) {
        console.error('[createAttachmentUpload]', error);
        return { success: false as const, message: 'Could not prepare the upload. Please try again.' };
    }
};

/** Marks an upload as complete after checking the file really is in storage with the declared size. */
export const confirmAttachmentUpload = async (attachmentId: string) => {
    const session = await getSessionWithRole('PATIENT', 'DOCTOR');
    if (!session) return { success: false as const, message: 'Please sign in to continue.' };
    try {
        const attachment = await prisma.messageAttachment.findFirst({
            where: { id: String(attachmentId ?? ''), uploaderId: session.user.id, messageId: null },
        });
        if (!attachment) return { success: false as const, message: 'Upload not found.' };

        const storedSize = await getObjectSize(attachment.storageKey);
        if (storedSize === null || storedSize !== attachment.size) {
            return { success: false as const, message: 'The upload did not complete. Please try again.' };
        }

        await prisma.messageAttachment.update({ where: { id: attachment.id }, data: { uploadedAt: new Date() } });
        const info: AttachmentInfo = { id: attachment.id, fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size };
        return { success: true as const, attachment: info };
    } catch (error) {
        console.error('[confirmAttachmentUpload]', error);
        return { success: false as const, message: 'Could not confirm the upload. Please try again.' };
    }
};

// ─── Deleting a message ───────────────────────────────────────────────────────

/**
 * Lets the sender delete their own message within MESSAGE_DELETE_WINDOW_MS of
 * sending it (e.g. the wrong photo or the wrong person). The text and any files
 * are permanently removed; a placeholder stays so the conversation still reads
 * correctly, and the deletion is audit-logged. After the window the message is
 * part of the care record and can't be deleted.
 */
export const deleteMessage = async (messageId: string) => {
    const session = await getSessionWithRole('PATIENT', 'DOCTOR');
    if (!session) return { success: false as const, message: 'Please sign in to continue.' };

    try {
        const message = await prisma.message.findFirst({
            where: { id: String(messageId ?? ''), senderId: session.user.id, deletedAt: null, messageStatus: { not: 'SYSTEM' } },
            select: { id: true, conversationId: true, createdAt: true, attachments: { select: { id: true, storageKey: true } } },
        });
        if (!message) return { success: false as const, message: 'Message not found.' };
        if (Date.now() - message.createdAt.getTime() > MESSAGE_DELETE_WINDOW_MS) {
            return { success: false as const, message: 'Messages can only be deleted within 15 minutes of sending.' };
        }

        // Remove the files from storage first, so a failure never leaves a "deleted" message whose file still exists.
        if (message.attachments.length) await deleteObjects(message.attachments.map(a => a.storageKey));

        await prisma.$transaction([
            prisma.messageAttachment.deleteMany({ where: { messageId: message.id } }),
            prisma.message.update({ where: { id: message.id }, data: { content: null, deletedAt: new Date() } }),
        ]);

        await recordAudit({
            actorId: session.user.id,
            action: 'MESSAGE_DELETED',
            entityType: 'Message',
            entityId: message.id,
            summary: message.attachments.length ? 'Deleted own chat message with an attachment' : 'Deleted own chat message',
            metadata: { conversationId: message.conversationId, attachments: message.attachments.length },
        });

        return { success: true as const };
    } catch (error) {
        console.error('[deleteMessage]', error);
        return { success: false as const, message: 'Could not delete the message. Please try again.' };
    }
};
