'use server'

import { prisma } from "@/lib/prisma";
import { MESSAGING_ALLOWED_STATUSES } from '@/lib/messaging-constants';

// ─── getPatientMessages ─────────────────────────────────────────────────────────

export const getPatientMessages = async (patientId: string) => {
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

export const getDoctorMessages = async (doctorId: string) => {
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
export const getAppointmentsForConversation = async (userId: string, userRole: string) => {
    try {
        const isPatient = userRole === 'PATIENT';

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
                status: { notIn: ['CANCELLED', 'PENDING_INTAKE', 'COMPLETED'] },
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
 * Upserts a conversation for a patient-doctor pair.
 *   - If one exists already: update activeAppointmentId to the new appointment.
 *   - If none exists: create one with this appointment as active.
 *
 * Uses @@unique([patientId, doctorId]) under the hood.
 */
export const createOrOpenConversation = async ({
    patientId,
    doctorId,
    appointmentId,
}: {
    patientId: string;
    doctorId: string;
    appointmentId: string;
}) => {
    try {
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

// ─── setActiveAppointment ──────────────────────────────────────────────────────
/**
 * Updates the activeAppointmentId on a conversation.
 * Called when an appointment status changes to a messaging-eligible status.
 */
export const setActiveAppointment = async (conversationId: string, appointmentId: string) => {
    try {
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { activeAppointmentId: appointmentId },
        });
        return { success: true };
    } catch (error) {
        console.error('[setActiveAppointment]', error);
        return { success: false };
    }
};

// ─── clearActiveAppointment ────────────────────────────────────────────────────
/**
 * Sets activeAppointmentId to null — called when an appointment is COMPLETED.
 * Locks messaging but preserves history.
 */
export const clearActiveAppointment = async (conversationId: string) => {
    try {
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { activeAppointmentId: null },
        });
        return { success: true };
    } catch (error) {
        console.error('[clearActiveAppointment]', error);
        return { success: false };
    }
};
