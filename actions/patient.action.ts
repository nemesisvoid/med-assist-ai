'use server';

/**
 * Patient server actions.
 *
 * Every export here is a public endpoint, so the patient is always the signed-in
 * user (from the session), never an ID passed in by the browser.
 */

import { prisma } from '@/lib/prisma';
import { AppointmentFormSchema, PatientInTakeFormSchema, PatientProfileFormSchema } from '@/validations/validation';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { generateMedicalRecordNumber } from '@/lib/utils';
import { createNotification } from '@/lib/notifications';
import { after } from 'next/server';
import { runTriage } from '@/lib/triage';
import { authFailure, getSessionWithRole, requireAppointmentPatient, requireRole } from '@/lib/authz';

export const getPatientProfile = async () => {
  const session = await getSessionWithRole('PATIENT');
  if (!session) return null;
  return prisma.patientProfile.findUnique({ where: { userId: session.user.id } });
};

export const createPatientProfile = async (formData: z.infer<typeof PatientProfileFormSchema>) => {
  try {
    const session = await requireRole('PATIENT');

    const validatedData = PatientProfileFormSchema.safeParse(formData);
    if (!validatedData.success) return { success: false, message: 'Please check the form and try again.' };

    const existing = await prisma.patientProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (existing) return { success: false, message: 'Your profile already exists.' };

    const { data } = validatedData;
    await prisma.patientProfile.create({
      data: {
        medicalRecordNumber: generateMedicalRecordNumber(),
        userId: session.user.id,
        dateOfBirth: data.dateOfBirth ?? new Date(),
        gender: data.gender,
        genotype: data.genotype,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        medications: data.medications,
        medicalHistory: data.medicalHistory,
        emergencyContact: data.emergencyContact,
        insuranceProvider: data.insuranceProvider,
      },
    });
    revalidatePath('/patient/dashboard');
    revalidatePath('/patient/appointment/create-appointment');
    return { success: true, message: 'Profile created successfully' };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error creating patient profile:', error);
    return { success: false, message: 'Failed to create profile' };
  }
};

export const createAppointment = async (formData: z.infer<typeof AppointmentFormSchema>) => {
  try {
    const session = await requireRole('PATIENT');
    const patientId = session.user.id;

    const validatedData = AppointmentFormSchema.safeParse(formData);
    if (!validatedData.success) return { success: false, message: 'Please check the form and try again.' };
    const { data } = validatedData;

    // The doctor must be a real, active clinician who has accepted their invite.
    const doctor = await prisma.user.findFirst({
      where: { id: data.doctor, role: 'DOCTOR', banned: false, accounts: { some: {} } },
      select: { id: true },
    });
    if (!doctor) return { success: false, message: 'That doctor is not available. Please choose another.' };

    // Enforced here, not only in the UI: one open appointment per patient-doctor pair.
    const active = await prisma.appointment.findFirst({
      where: { patientId, doctorId: doctor.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: { id: true },
    });
    if (active) return { success: false, message: 'You already have an open appointment with this doctor.' };

    const res = await prisma.appointment.create({
      data: {
        patientId,
        scheduledAt: data.scheduledAt,
        scheduledTime: data.scheduledTime,
        appointmentReason: data.appointmentReason,
        appointmentType: data.appointmentType,
        doctorId: doctor.id,
      },
    });

    await createNotification({
      type: 'APPOINTMENT',
      userId: patientId,
      title: 'Appointment Scheduled',
      message: 'Your appointment has been successfully scheduled.',
    });
    await createNotification({
      type: 'INTAKE_FORM',
      userId: patientId,
      title: 'Appointment Scheduled',
      message: `Please complete your intake form for your ${res.appointmentType} appointment`,
    });
    await createNotification({
      type: 'APPOINTMENT',
      userId: doctor.id,
      title: 'New Appointment Assigned',
      message: 'A new patient appointment has been assigned to you',
    });

    return { success: true, message: 'Appointment created successfully' };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error creating appointment:', error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const checkActiveAppointment = async (doctorId: string) => {
  const session = await getSessionWithRole('PATIENT');
  if (!session) return { hasActive: false };
  try {
    const existing = await prisma.appointment.findFirst({
      where: { patientId: session.user.id, doctorId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: { id: true },
    });
    return { hasActive: !!existing };
  } catch (error) {
    console.error('Error checking active appointment:', error);
    return { hasActive: false };
  }
};

export const createIntakeForm = async (formData: z.infer<typeof PatientInTakeFormSchema>) => {
  try {
    const validatedData = PatientInTakeFormSchema.safeParse(formData);
    if (!validatedData.success) return { success: false, message: 'Please check the form and try again.' };
    const data = validatedData.data;

    // Only the patient on this appointment can submit its intake, and only while it's open.
    const { appointment } = await requireAppointmentPatient(data.appointmentId, { requireOpen: true });

    const existing = await prisma.intakeForm.findUnique({ where: { appointmentId: data.appointmentId }, select: { id: true } });
    // A submitted intake can only be replaced when the doctor asked for an update
    // (requestUpdatedIntakeAction puts the appointment back to PENDING_INTAKE).
    const isUpdate = !!existing;
    if (isUpdate && appointment.status !== 'PENDING_INTAKE') {
      return { success: false, message: 'Your intake form has already been submitted.' };
    }

    const painLevel = Math.min(10, Math.max(0, Number(data.painLevel) || 0));
    const fields = {
      chiefComplaint: data.complaint,
      currentSymptoms: data.currentSymptoms,
      painLevel,
      allergies: data.allergies,
      medications: data.medication,
      additionalNotes: data.additionalNotes,
    };

    await prisma.$transaction([
      prisma.intakeForm.upsert({
        where: { appointmentId: data.appointmentId },
        create: { appointmentId: data.appointmentId, ...fields },
        update: fields,
      }),
      // The intake is received, so the visit is ready for review now (not when the background
      // triage finishes). The previous AI triage described the old answers; clear it so it is
      // re-run, never shown stale.
      prisma.appointment.update({
        where: { id: data.appointmentId },
        data: {
          ...(appointment.status === 'PENDING_INTAKE' ? { status: 'READY_FOR_REVIEW' as const } : {}),
          riskLevel: null,
          severityLevel: null,
          aiRiskSummary: null,
          aiRecommendation: null,
          priority: 'MEDIUM',
        },
      }),
    ]);

    // Run AI triage after the response is sent. `after` keeps the serverless
    // function alive until it finishes; failures are handled inside runTriage.
    after(() => runTriage(data.appointmentId).catch(error => console.error('[triage] unexpected error:', error)));
    revalidatePath('/patient/appointment');
    revalidatePath('/patient/dashboard');
    return { success: true, message: isUpdate ? 'Intake form updated' : 'Intake form submitted' };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return failure;
    console.error('Error creating intake form:', error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const getPatientAppointments = async () => {
  const session = await getSessionWithRole('PATIENT');
  if (!session) return [];
  return prisma.appointment.findMany({
    where: { patientId: session.user.id },
    include: {
      intakeForm: { select: { id: true } },
      doctor: { select: { name: true } },
    },
  });
};

/** The signed-in user's notifications (any role). */
export const getUserNotifications = async () => {
  const session = await getSessionWithRole();
  if (!session) return [];
  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { isRead: 'asc' }, // unread (false) comes before read (true)
      { createdAt: 'desc' }, // newest first within each group
    ],
  });
};

export const getPatientAppointmentById = async (appointmentId: string) => {
  const session = await getSessionWithRole('PATIENT');
  if (!session) return undefined;
  try {
    const res = await prisma.appointment.findUnique({
      where: { id: appointmentId, patientId: session.user.id },
      include: {
        clinicalNote: { include: { prescriptions: true } },
        intakeForm: true,
        followUp: true,
        doctor: { include: { doctorProfile: true } },
      },
    });
    return res ?? undefined;
  } catch (error) {
    console.error('Error loading appointment:', error);
    return undefined;
  }
};

export const patientStats = async () => {
  const session = await getSessionWithRole('PATIENT');
  const patientId = session?.user.id ?? '';

  const [upcoming, unreadNotifications, completedAppointments, pendingIntakeForms, unreadMessages, totalPrescriptions] = session
    ? await Promise.all([
        prisma.appointment.count({ where: { patientId, scheduledAt: { gte: new Date() } } }),
        prisma.notification.count({ where: { userId: patientId, isRead: false } }),
        prisma.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
        prisma.appointment.count({ where: { patientId, status: 'PENDING_INTAKE' } }),
        prisma.message.count({ where: { receiverId: patientId, isRead: false } }),
        prisma.prescription.count({ where: { clinicalNote: { appointment: { patientId } } } }),
      ])
    : [0, 0, 0, 0, 0, 0];

  return { upcoming, unreadNotifications, completedAppointments, pendingIntakeForms, unreadMessages, totalPrescriptions };
};
