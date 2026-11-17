'use server'

import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from '@/lib/authz';

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
