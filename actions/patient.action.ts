'use server';

import { prisma } from '@/lib/prisma';
import { AppointmentFormSchema, PatientInTakeFormSchema, PatientProfileFormSchema } from '@/validations/validation';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { generateMedicalRecordNumber } from '@/lib/utils';
import { createNotification } from './notification.action';
import { after } from 'next/server';
import { runTriage } from '@/lib/triage';

export const getPatientProfile = async (userId: string | undefined) => {
  try {
    if (!userId) throw new Error('User not found');
    const res = await prisma.patientProfile.findUnique({
      where: {
        userId: userId,
      },
    });
    return res;
  } catch (error) {
    console.log(error, 'error getting profile');
  }
};

export const createPatientProfile = async (userId: string | undefined, formData: z.infer<typeof PatientProfileFormSchema>) => {
  try {
    if (!userId) throw new Error('User not found');

    const validatedData = PatientProfileFormSchema.safeParse(formData);

    if (!validatedData.success) throw new Error(validatedData.error.message);

    const { data } = validatedData;
    const res = await prisma.patientProfile.create({
      data: {
        medicalRecordNumber: generateMedicalRecordNumber(),
        userId: userId,
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
    console.log(error, 'error creating profile');
    return { success: false, message: 'Failed to create profile' };
  }
};

export const createAppointment = async (userId: string, formData: z.infer<typeof AppointmentFormSchema>) => {
  try {
    const validatedData = AppointmentFormSchema.safeParse(formData);
    if (!validatedData.success) {
      throw new Error(validatedData.error.message);
    }

    const { data } = validatedData;
    const res = await prisma.appointment.create({
      data: {
        patientId: userId,
        scheduledAt: data.scheduledAt,
        scheduledTime: data.scheduledTime,
        appointmentReason: data.appointmentReason,
        appointmentType: data.appointmentType,
        doctorId: data.doctor,
      },
    });

    await prisma.notification.create({
      data: {
        type: 'APPOINTMENT',
        userId,
        title: 'Appointment Scheduled',
        message: 'Your appointment has been successfully scheduled.',
      },
    });

    await prisma.notification.create({
      data: {
        type: 'INTAKE_FORM',
        userId,
        title: 'Appointment Scheduled',
        message: `Please complete your intake form for your ${res.appointmentType} appointment`,
      },
    });

    if (data.doctor) {
      await prisma.notification.create({
        data: {
          title: 'New Appointment Assigned',
          userId: data.doctor,
          message: `A new patient appointment has been assigned to you`,
          type: 'APPOINTMENT',
        },
      });
    }
    return { success: true, message: 'Appointment created successfully' };
  } catch (error) {
    console.log('Error creating appointment:', error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const checkActiveAppointment = async (patientId: string, doctorId: string) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      select: { id: true },
    });
    return { hasActive: !!existing };
  } catch (error) {
    console.log('Error checking active appointment:', error);
    return { hasActive: false };
  }
};

export const createIntakeForm = async (userId: string, formData: z.infer<typeof PatientInTakeFormSchema>) => {
  try {
    const res = await prisma.intakeForm.create({
      data: {
        appointmentId: formData.appointmentId,
        chiefComplaint: formData.complaint,
        currentSymptoms: formData.currentSymptoms,
        painLevel: Number(formData.painLevel),
        allergies: formData.allergies,
        medications: formData.medication,
        additionalNotes: formData.additionalNotes,
      },
    });
    // Run AI triage after the response is sent. `after` keeps the serverless
    // function alive until it finishes; failures are handled inside runTriage.
    after(() => runTriage(formData.appointmentId).catch(error => console.error('[triage] unexpected error:', error)));
    return { success: true, message: 'Intake form created successfully' };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Something went wrong' };
  }
};

export const getPatientAppointments = async (userId: string) => {
  const res = await prisma.appointment.findMany({
    where: {
      patientId: userId,
    },
    include: {
      intakeForm: {
        select: { id: true },
      },
      doctor: {
        select: {
          name: true,
        },
      },
    },
  });
  return res;
};

export const getUserNotifications = async (userId: string) => {
  const res = await prisma.notification.findMany({
    where: {
      userId: userId,
    },
    orderBy: [
      { isRead: 'asc' }, // unread (false) comes before read (true)
      { createdAt: 'desc' }, // newest first within each group
    ],
  });
  return res;
};

export const getPatientAppointmentById = async (appointmentId: string, patientId: string) => {
  try {
    const res = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        patientId,
      },
      include: {
        clinicalNote: {
          include: {
            prescriptions: true,
          },
        },
        intakeForm: true,
        followUp: true,
        doctor: {
          include: {
            doctorProfile: true,
          },
        },
      },
    });

    if (!res) throw new Error('Appointment not found');

    return res;
  } catch (error) {
    console.log(error);
    // throw error;
  }
};


export const patientStats = async (patientId: string) => {
  const upcoming = await prisma.appointment.count({
    where: {
      patientId,
      scheduledAt: {
        gte: new Date(),
      },
    },
  });

  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: patientId,
      isRead: false,
    },
  });

  const completedAppointments = await prisma.appointment.count({
    where: {
      patientId,
      status: 'COMPLETED',
    },
  });

  const pendingIntakeForms = await prisma.appointment.count({
    where: {
      patientId,
      status: 'PENDING_INTAKE',
    },
  });

  const unreadMessages = await prisma.message.count({
    where: {
      receiverId: patientId,
      isRead: false,
    },
  });

  const totalPrescriptions = await prisma.prescription.count({
    where: {
      clinicalNote: {
        appointment: {
          patientId,
        },
      },
    },
  });

  return {
    upcoming,
    unreadNotifications,
    completedAppointments,
    pendingIntakeForms,
    unreadMessages,
    totalPrescriptions,
  };
};