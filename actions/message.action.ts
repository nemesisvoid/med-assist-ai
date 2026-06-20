'use server'

import { prisma } from "@/lib/prisma";
import { MessageFormSchema } from "@/schema/validators";
import * as z from 'zod';


export const sendMessage = async (formData: z.infer<typeof MessageFormSchema>) => {
    try {
        const validatedData = MessageFormSchema.safeParse(formData);
        if (!validatedData.success) {
            throw new Error(validatedData.error.message);
        }

        const { data } = validatedData;
        await prisma.message.create({
            data: {
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                isRead: false,
            },
        });
        return { success: true, message: 'Message sent successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'Something went wrong' };
    }
}


export const getPatientMessages = async (patientId: string) => {
    try {
        const res = await prisma.conversation.findMany({
            where: {
                patientId: patientId,
                appointmentId: { not: null },
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
                doctor: {
                    select: {
                        name: true,
                        image: true,
                        doctorProfile: {
                            select: { specialty: true, imageUrl: true },
                        },
                    },
                },
                appointment: {
                    select: {
                        id: true,
                        status: true,
                        appointmentType: true,
                        scheduledAt: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
        });

        return { success: true, data: res };
    }
    catch (error) {
        console.log(error);
        return { success: false, message: 'Something went wrong' };
    }
}

export const getDoctorMessages = async (doctorId: string) => {
    try {
        const res = await prisma.conversation.findMany({
            where: {
                doctorId: doctorId,
                appointmentId: { not: null },
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
                patient: {
                    select: {
                        name: true,
                        image: true,
                        patientProfile: {
                            select: { imageUrl: true },
                        },
                    },
                },
                appointment: {
                    select: {
                        id: true,
                        status: true,
                        appointmentType: true,
                        scheduledAt: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
        });

        return { success: true, data: res };
    }
    catch (error) {
        console.log(error);
        return { success: false, message: 'Something went wrong' };
    }
}

/**
 * Fetches appointments eligible for starting a new conversation.
 * Excludes: CANCELLED, PENDING_INTAKE, COMPLETED.
 * An appointment that already has a conversation surfaces its conversationId
 * so the dialog can navigate to it directly instead of creating a duplicate.
 */
export const getAppointmentsForConversation = async (userId: string, userRole: string) => {
    try {
        const isPatient = userRole === 'PATIENT';

        // Fetch existing conversations keyed by appointmentId
        const existingConversations = await prisma.conversation.findMany({
            where: {
                ...(isPatient ? { patientId: userId } : { doctorId: userId }),
                appointmentId: { not: null },
            },
            select: { id: true, appointmentId: true },
        });

        // Build a map: appointmentId -> conversationId
        const appointmentConversationMap = new Map<string, string>(
            existingConversations
                .filter(c => c.appointmentId !== null)
                .map(c => [c.appointmentId as string, c.id])
        );

        const appointments = await prisma.appointment.findMany({
            where: {
                ...(isPatient ? { patientId: userId, doctorId: { not: null } } : { doctorId: userId }),
                // Exclude cancelled, incomplete intake, and completed appointments
                status: { notIn: ['CANCELLED', 'PENDING_INTAKE', 'COMPLETED'] },
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        doctorProfile: { select: { specialty: true, imageUrl: true } },
                    },
                },
                patient: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        patientProfile: { select: { imageUrl: true } },
                    },
                },
            },
            orderBy: { scheduledAt: 'asc' },
        });

        // Check if there are any pending intake appointments
        const hasPendingIntake = isPatient ? (await prisma.appointment.count({
            where: {
                patientId: userId,
                status: 'PENDING_INTAKE',
            }
        })) > 0 : false;

        // Normalize the partner so the client doesn't need to check role
        const normalized = appointments.map(appt => ({
            id: appt.id,
            appointmentType: appt.appointmentType,
            appointmentReason: appt.appointmentReason,
            scheduledAt: appt.scheduledAt,
            scheduledTime: appt.scheduledTime,
            status: appt.status,
            // Expose the existing conversation for this specific appointment (if any)
            existingConversationId: appointmentConversationMap.get(appt.id) ?? null,
            partner: isPatient
                ? { id: appt.doctor?.id, name: appt.doctor?.name, image: appt.doctor?.image, specialty: appt.doctor?.doctorProfile?.specialty, imageUrl: appt.doctor?.doctorProfile?.imageUrl }
                : { id: appt.patient.id, name: appt.patient.name, image: appt.patient.image, specialty: 'Patient', imageUrl: appt.patient.patientProfile?.imageUrl }
        }));

        return { success: true, data: normalized, hasPendingIntake };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'Something went wrong', data: [], hasPendingIntake: false };
    }
};

/**
 * Creates a conversation for a patient-doctor pair tied to a specific appointment.
 * Deduplicates on patientId + doctorId + appointmentId to prevent exact duplicates.
 */
export const createConversation = async ({
    patientId,
    doctorId,
    appointmentId,
}: {
    patientId: string;
    doctorId: string;
    appointmentId: string;
}) => {
    try {
        // Prevent duplicate conversations for the same appointment
        const existing = await prisma.conversation.findFirst({
            where: { patientId, doctorId, appointmentId },
        });
        if (existing) {
            return { success: true, data: existing };
        }

        const conversation = await prisma.conversation.create({
            data: { patientId, doctorId, appointmentId },
        });

        return { success: true, data: conversation };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'Failed to create conversation' };
    }
};
