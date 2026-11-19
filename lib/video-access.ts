/**
 * Who may join an appointment's video call. Server-only, shared by the call page
 * and the joinVideoCall action so both apply exactly the same rule:
 *   - the user is the appointment's patient or its assigned clinician, and
 *   - the appointment is open (not cancelled or completed) and has a clinician.
 *
 * There is deliberately no time-of-day window yet: appointment times are stored
 * as a date plus a time string without a timezone, so "15 minutes before" can't
 * be computed reliably. Joining is limited to open appointments instead.
 */

import { prisma } from '@/lib/prisma';
import { formatDoctorName } from '@/lib/utils';

export type VideoAccess =
  | { ok: false; reason: 'not_found' | 'closed' | 'no_clinician' }
  | {
      ok: true;
      appointment: { id: string; appointmentType: string; scheduledAt: Date; scheduledTime: string | null; status: string };
      isClinician: boolean;
      selfName: string;
      partner: { id: string; name: string };
    };

export async function getVideoAccess(appointmentId: string, userId: string): Promise<VideoAccess> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, OR: [{ patientId: userId }, { doctorId: userId }] },
    select: {
      id: true,
      appointmentType: true,
      scheduledAt: true,
      scheduledTime: true,
      status: true,
      patient: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, doctorProfile: { select: { providerType: true, credentials: true } } } },
    },
  });
  if (!appointment) return { ok: false, reason: 'not_found' };
  if (!appointment.doctor) return { ok: false, reason: 'no_clinician' };
  if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') return { ok: false, reason: 'closed' };

  const clinicianName = formatDoctorName(appointment.doctor.name, appointment.doctor.doctorProfile);
  const isClinician = appointment.doctor.id === userId;
  return {
    ok: true,
    appointment: {
      id: appointment.id,
      appointmentType: appointment.appointmentType,
      scheduledAt: appointment.scheduledAt,
      scheduledTime: appointment.scheduledTime,
      status: appointment.status,
    },
    isClinician,
    selfName: isClinician ? clinicianName : appointment.patient.name,
    partner: isClinician
      ? { id: appointment.patient.id, name: appointment.patient.name }
      : { id: appointment.doctor.id, name: clinicianName },
  };
}
