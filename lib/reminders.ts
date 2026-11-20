/**
 * In-app appointment reminders (server-only).
 *
 * Created when the patient or clinician opens the app (patient/doctor layouts),
 * so no scheduled job is needed. Each reminder has a unique dedupeKey that
 * includes the appointment time, so it is created once, and a rescheduled
 * appointment gets fresh reminders for its new time.
 */

import { prisma } from '@/lib/prisma';
import { getClinicSettings } from '@/lib/clinic';
import { clinicLocalToUtc, slotTo24h } from '@/lib/clinic-hours';
import { formatDoctorName } from '@/lib/utils';

const HOUR = 60 * 60 * 1000;
const WINDOWS = [
  { kind: '1h', within: HOUR },
  { kind: '24h', within: 24 * HOUR },
] as const;

export async function ensureUpcomingReminders(user: { id: string; role: string }): Promise<void> {
  const isPatient = user.role === 'PATIENT';
  if (!isPatient && user.role !== 'DOCTOR') return;

  const now = Date.now();
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(isPatient ? { patientId: user.id } : { doctorId: user.id }),
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      scheduledTime: { not: null },
      // Wide window in UTC; the exact start is computed in the clinic's timezone below.
      scheduledAt: { gte: new Date(now - 36 * HOUR), lte: new Date(now + 48 * HOUR) },
    },
    select: {
      id: true,
      appointmentType: true,
      scheduledAt: true,
      scheduledTime: true,
      visitMode: true,
      patient: { select: { name: true } },
      doctor: { select: { name: true, doctorProfile: { select: { providerType: true, credentials: true } } } },
    },
  });
  if (appointments.length === 0) return;

  const clinic = await getClinicSettings();
  const rows: { userId: string; type: 'APPOINTMENT'; title: string; message: string; link: string; dedupeKey: string }[] = [];

  for (const appt of appointments) {
    const time24 = appt.scheduledTime ? slotTo24h(appt.scheduledTime) : null;
    if (!time24) continue;
    const dateKey = appt.scheduledAt.toISOString().slice(0, 10);
    const startsAt = clinicLocalToUtc(dateKey, time24, clinic.timezone).getTime();
    const untilStart = startsAt - now;
    if (untilStart <= 0) continue;

    // Only the most urgent applicable reminder (no "tomorrow" reminder an hour before).
    const window = WINDOWS.find(w => untilStart <= w.within);
    if (!window) continue;

    const withWhom = isPatient
      ? appt.doctor
        ? ` with ${formatDoctorName(appt.doctor.name, appt.doctor.doctorProfile)}`
        : ''
      : ` with ${appt.patient.name}`;
    const when = window.kind === '1h' ? `starts at ${appt.scheduledTime}` : `is at ${appt.scheduledTime} ${untilStart <= 12 * HOUR ? 'today' : 'tomorrow'}`;
    const how = appt.visitMode === 'VIDEO' ? ' Join the video call from the appointment page.' : ` In person at ${clinic.name}.`;

    rows.push({
      userId: user.id,
      type: 'APPOINTMENT',
      title: window.kind === '1h' ? 'Appointment starting soon' : 'Upcoming appointment',
      message: `Your ${appt.appointmentType} appointment${withWhom} ${when}.${how}`,
      link: isPatient ? `/patient/appointment/${appt.id}` : `/doctor/appointment/${appt.id}`,
      dedupeKey: `reminder:${window.kind}:${appt.id}:${user.id}:${dateKey}T${time24}`,
    });
  }

  if (rows.length) await prisma.notification.createMany({ data: rows, skipDuplicates: true });
}
