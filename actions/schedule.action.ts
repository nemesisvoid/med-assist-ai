'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { getSessionWithRole } from '@/lib/authz';
import { formatDoctorName } from '@/lib/utils';
import { ANY_AVAILABLE_CLINICIAN } from '@/constants/booking';
import { SlotUnavailableError, assertSlotBookable, getSlotAvailability, toBookingDate, type SlotAvailability } from '@/lib/scheduling';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_STATUSES_EXCLUDED = ['COMPLETED', 'CANCELLED'] as const;

type SlotsResult = { success: true; availability: SlotAvailability } | { success: false; message: string };

/**
 * Bookable times for a day.
 *  - Booking: pass `doctorId` (a clinician id or "any_available").
 *  - Rescheduling: pass `appointmentId`; the caller must be its patient or clinician.
 */
export const getAvailableSlots = async (input: { date: string; doctorId?: string; appointmentId?: string }): Promise<SlotsResult> => {
  const session = await getSessionWithRole('PATIENT', 'DOCTOR');
  if (!session) return { success: false, message: 'Please sign in to continue.' };
  if (!DATE_KEY.test(String(input?.date ?? ''))) return { success: false, message: 'Choose a valid date.' };
  const date = toBookingDate(input.date);

  try {
    if (input.appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: input.appointmentId, OR: [{ patientId: session.user.id }, { doctorId: session.user.id }] },
        select: { id: true, doctorId: true },
      });
      if (!appt) return { success: false, message: 'Appointment not found.' };
      return { success: true, availability: await getSlotAvailability({ doctorId: appt.doctorId, date, excludeAppointmentId: appt.id }) };
    }

    if (input.doctorId && input.doctorId !== ANY_AVAILABLE_CLINICIAN) {
      const doctor = await prisma.user.findFirst({ where: { id: input.doctorId, role: 'DOCTOR', banned: false }, select: { id: true } });
      if (!doctor) return { success: false, message: 'That clinician is not available.' };
      return { success: true, availability: await getSlotAvailability({ doctorId: doctor.id, date }) };
    }
    return { success: true, availability: await getSlotAvailability({ doctorId: null, date }) };
  } catch (error) {
    console.error('[getAvailableSlots]', error);
    return { success: false, message: 'Could not load available times.' };
  }
};

/**
 * The patient or the assigned clinician moves an appointment to another free
 * slot. The other person is notified and the change is audit-logged.
 */
export const rescheduleAppointment = async (input: { appointmentId: string; date: string; time: string }) => {
  const session = await getSessionWithRole('PATIENT', 'DOCTOR');
  if (!session) return { success: false as const, message: 'Please sign in to continue.' };
  if (!DATE_KEY.test(String(input?.date ?? '')) || typeof input?.time !== 'string') {
    return { success: false as const, message: 'Choose a date and time.' };
  }

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: String(input.appointmentId ?? ''), OR: [{ patientId: session.user.id }, { doctorId: session.user.id }] },
      select: {
        id: true,
        status: true,
        appointmentType: true,
        scheduledAt: true,
        scheduledTime: true,
        patientId: true,
        doctorId: true,
        patient: { select: { name: true } },
        doctor: { select: { name: true, doctorProfile: { select: { providerType: true, credentials: true } } } },
      },
    });
    if (!appt) return { success: false as const, message: 'Appointment not found.' };
    if ((OPEN_STATUSES_EXCLUDED as readonly string[]).includes(appt.status)) {
      return { success: false as const, message: 'This appointment is closed and can’t be rescheduled.' };
    }

    const newDate = toBookingDate(input.date);
    const sameSlot = appt.scheduledAt.toISOString().slice(0, 10) === input.date && appt.scheduledTime === input.time;
    if (sameSlot) return { success: false as const, message: 'That’s already the appointment time.' };

    await prisma.$transaction(async tx => {
      await assertSlotBookable(tx, { doctorId: appt.doctorId, date: newDate, time: input.time, excludeAppointmentId: appt.id });
      await tx.appointment.update({ where: { id: appt.id }, data: { scheduledAt: newDate, scheduledTime: input.time } });
    });

    const byClinician = appt.doctorId === session.user.id;
    const actorName = byClinician ? formatDoctorName(appt.doctor?.name, appt.doctor?.doctorProfile) : appt.patient.name;
    const when = `${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(newDate)} at ${input.time}`;
    const from = `${appt.scheduledAt.toISOString().slice(0, 10)} ${appt.scheduledTime ?? ''}`.trim();
    const otherPartyId = byClinician ? appt.patientId : appt.doctorId;

    if (otherPartyId) {
      await createNotification({
        userId: otherPartyId,
        type: 'APPOINTMENT',
        title: 'Appointment rescheduled',
        message: `${actorName} moved your ${appt.appointmentType} appointment to ${when}.`,
        link: byClinician ? `/patient/appointment/${appt.id}` : `/doctor/appointment/${appt.id}`,
      });
    }

    await recordAudit({
      actorId: session.user.id,
      action: 'APPOINTMENT_RESCHEDULED',
      entityType: 'Appointment',
      entityId: appt.id,
      summary: `Rescheduled by ${byClinician ? 'clinician' : 'patient'} from ${from} to ${input.date} ${input.time}`,
    });

    for (const path of [`/patient/appointment/${appt.id}`, `/doctor/appointment/${appt.id}`, '/patient/appointment', '/doctor/appointment']) revalidatePath(path);
    return { success: true as const, message: `Moved to ${when}.${otherPartyId ? ' They’ve been notified.' : ''}` };
  } catch (error) {
    if (error instanceof SlotUnavailableError) return { success: false as const, message: error.message };
    console.error('[rescheduleAppointment]', error);
    return { success: false as const, message: 'Could not reschedule. Please try again.' };
  }
};
