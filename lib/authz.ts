import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/get-user';
import { prisma } from '@/lib/prisma';
import { getDashboardPath, LOGIN_PATH } from '@/routes';

/**
 * Authorization helpers for server actions.
 *
 * Every exported function in a 'use server' file is a public HTTP endpoint that
 * anyone can call with any arguments. So actions never take "who am I" from the
 * browser: the caller's identity comes from the session cookie, and access to a
 * specific record is checked against that identity.
 */

export type AppRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export class AuthorizationError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** Session of the caller. Throws if not signed in, or (when roles are given) not one of them. */
export async function requireRole(...roles: AppRole[]) {
  const session = await getLoggedInUser();
  if (!session) throw new AuthorizationError('Please sign in to continue.');
  if (roles.length > 0 && !roles.includes(session.user.role as AppRole)) throw new AuthorizationError();
  return session;
}

/** Session of the caller if they have one of the roles, otherwise null (for read-only loaders). */
export async function getSessionWithRole(...roles: AppRole[]) {
  const session = await getLoggedInUser();
  if (!session || (roles.length > 0 && !roles.includes(session.user.role as AppRole))) return null;
  return session;
}

/**
 * Guard for admin server actions and data loaders.
 * The proxy already blocks non-admins from /admin pages, but server actions are
 * independently reachable endpoints, so every one re-checks the role here.
 */
export async function requireAdmin() {
  return requireRole('ADMIN');
}

/** Page/layout variant: redirects instead of throwing. */
export async function requireAdminPage() {
  const session = await getLoggedInUser();
  if (!session) redirect(LOGIN_PATH);
  if (session.user.role !== 'ADMIN') redirect(getDashboardPath(session.user.role));
  return session;
}

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED'] as const;

export const isClosedStatus = (status: string) => (CLOSED_STATUSES as readonly string[]).includes(status);

/**
 * The caller must be the doctor assigned to this appointment.
 * Unknown and other doctors' appointments both report "not found", so IDs can't be probed.
 * With `requireOpen`, completed or cancelled appointments are rejected (the clinical record is locked).
 */
export async function requireAssignedDoctor(appointmentId: string, { requireOpen = false } = {}) {
  const session = await requireRole('DOCTOR');
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, doctorId: true, patientId: true, status: true, appointmentType: true },
  });
  if (!appointment || appointment.doctorId !== session.user.id) throw new AuthorizationError('Appointment not found.');
  if (requireOpen && isClosedStatus(appointment.status)) {
    throw new AuthorizationError('This appointment is closed and can no longer be changed.');
  }
  return { session, appointment };
}

/** The caller must be the patient on this appointment. */
export async function requireAppointmentPatient(appointmentId: string, { requireOpen = false } = {}) {
  const session = await requireRole('PATIENT');
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, doctorId: true, patientId: true, status: true, appointmentType: true },
  });
  if (!appointment || appointment.patientId !== session.user.id) throw new AuthorizationError('Appointment not found.');
  if (requireOpen && isClosedStatus(appointment.status)) {
    throw new AuthorizationError('This appointment is closed and can no longer be changed.');
  }
  return { session, appointment };
}

/** Converts an AuthorizationError into the `{ success: false, message }` shape actions return. */
export function authFailure(error: unknown): { success: false; message: string } | null {
  return error instanceof AuthorizationError ? { success: false, message: error.message } : null;
}
