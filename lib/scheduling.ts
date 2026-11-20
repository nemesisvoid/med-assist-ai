/**
 * Appointment slot rules (server-only), used by booking, rescheduling and
 * reassignment so they all agree:
 *
 *   - A slot must be within the clinic's opening hours AND, if the clinician
 *     has set their own working hours, within those too.
 *   - It can't be in the past (in the clinic's timezone).
 *   - A clinician can't have two open appointments at the same date and time.
 *
 * `assertSlotBookable` runs inside the booking transaction and takes a Postgres
 * advisory lock on (clinician, date, time) first, so two people booking the
 * same slot at the same moment can't both succeed.
 */

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getClinicSettings } from '@/lib/clinic';
import {
  bookingDateKey,
  parseOpeningHours,
  slotTo24h,
  slotsForDay,
  todayInTimezone,
  weekdayOf,
  type DayHours,
  type OpeningHours,
} from '@/lib/clinic-hours';

type Db = Prisma.TransactionClient | typeof prisma;

/** Appointments in these statuses no longer hold their time slot. */
const SLOT_FREEING_STATUSES = ['CANCELLED', 'COMPLETED'] as const;

export type SlotStatus = 'free' | 'booked';
export type SlotAvailability = {
  timezone: string;
  /** Effective hours for the day (clinic ∩ clinician); null when nobody is working. */
  hours: DayHours;
  closedReason: 'clinic_closed' | 'clinician_off' | null;
  slots: { time: string; status: SlotStatus }[];
};

export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

/** Overlap of two days' hours; a missing restriction (undefined) means "no limit". */
export function intersectHours(a: DayHours, b: DayHours | undefined): DayHours {
  if (b === undefined) return a;
  if (!a || !b) return null;
  const open = a.open > b.open ? a.open : b.open;
  const close = a.close < b.close ? a.close : b.close;
  return open < close ? { open, close } : null;
}

/** The clinician's own weekly hours, or null if they follow the clinic's. */
export async function getClinicianHours(doctorId: string, db: Db = prisma): Promise<OpeningHours | null> {
  const profile = await db.doctorProfile.findUnique({ where: { userId: doctorId }, select: { workingHours: true } });
  return profile?.workingHours ? parseOpeningHours(profile.workingHours) : null;
}

const dayRange = (date: Date) => {
  const start = new Date(`${bookingDateKey(date)}T00:00:00.000Z`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

/** "HH:MM" now in the clinic's timezone. */
function nowTimeInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'hour')?.value ?? '00'}:${parts.find(p => p.type === 'minute')?.value ?? '00'}`;
}

/** Slots for a day: within clinic ∩ clinician hours, not in the past, marked booked if the clinician is taken. */
export async function getSlotAvailability(
  {
    doctorId,
    date,
    excludeAppointmentId,
    ignorePast = false,
  }: { doctorId: string | null; date: Date; excludeAppointmentId?: string; /** Admin reassignment of an overdue appointment. */ ignorePast?: boolean },
  db: Db = prisma,
): Promise<SlotAvailability> {
  const clinic = await getClinicSettings();
  const day = weekdayOf(date);
  const clinicDay = clinic.openingHours[day];
  const clinicianHours = doctorId ? await getClinicianHours(doctorId, db) : null;
  const hours = intersectHours(clinicDay, clinicianHours ? clinicianHours[day] : undefined);

  const closedReason = !clinicDay ? 'clinic_closed' : !hours ? 'clinician_off' : null;
  let times = slotsForDay(hours);

  // Past dates have no slots; today only has slots that haven't started yet.
  const dateKey = bookingDateKey(date);
  const today = todayInTimezone(clinic.timezone);
  if (ignorePast) {
    // keep every slot in the day
  } else if (dateKey < today) times = [];
  else if (dateKey === today) {
    const now = nowTimeInTimezone(clinic.timezone);
    times = times.filter(t => (slotTo24h(t) ?? '00:00') > now);
  }

  const booked = new Set<string>();
  if (doctorId && times.length) {
    const taken = await db.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: dayRange(date),
        status: { notIn: [...SLOT_FREEING_STATUSES] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { scheduledTime: true },
    });
    for (const a of taken) if (a.scheduledTime) booked.add(a.scheduledTime);
  }

  return {
    timezone: clinic.timezone,
    hours,
    closedReason,
    slots: times.map(time => ({ time, status: booked.has(time) ? 'booked' : 'free' })),
  };
}

/**
 * Throws SlotUnavailableError unless the slot can be booked. Call inside the
 * transaction that writes the appointment: it locks the slot for the rest of
 * that transaction.
 */
export async function assertSlotBookable(
  tx: Prisma.TransactionClient,
  {
    doctorId,
    date,
    time,
    excludeAppointmentId,
    ignorePast = false,
  }: { doctorId: string | null; date: Date; time: string; excludeAppointmentId?: string; ignorePast?: boolean },
): Promise<void> {
  if (doctorId) {
    const lockKey = `appointment-slot:${doctorId}:${bookingDateKey(date)}:${time}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  }

  const availability = await getSlotAvailability({ doctorId, date, excludeAppointmentId, ignorePast }, tx);
  const slot = availability.slots.find(s => s.time === time);
  if (!slot) {
    throw new SlotUnavailableError(
      availability.closedReason === 'clinic_closed'
        ? 'The clinic is closed at that time. Please choose another time.'
        : availability.closedReason === 'clinician_off'
          ? 'Your clinician isn’t working that day. Please choose another day.'
          : 'That time isn’t available. Please choose another time.',
    );
  }
  if (slot.status === 'booked') {
    throw new SlotUnavailableError('That time was just booked by someone else. Please choose another time.');
  }
}

/** Booking dates are stored as UTC midnight of the chosen calendar day. */
export const toBookingDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
