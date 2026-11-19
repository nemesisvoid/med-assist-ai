'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

import { prisma } from '@/lib/prisma';
import { auth, STAFF_INVITE_REDIRECT } from '@/lib/auth';
import { AuthorizationError, requireAdmin } from '@/lib/authz';
import { recordAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { OPEN_APPOINTMENT_STATUSES } from '@/lib/data/admin';
import {
  AvailabilitySchema,
  CancelAppointmentSchema,
  ChangeRoleSchema,
  InviteAdminSchema,
  InviteDoctorSchema,
  ReassignAppointmentSchema,
  SuspendUserSchema,
  type InviteAdminInput,
  type InviteDoctorInput,
} from '@/validations/admin';
import { ClinicSettingsSchema, type ClinicSettingsInput } from '@/validations/clinic';
import { CLINIC_SETTINGS_ID, getClinicSettings } from '@/lib/clinic';

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

/** Wraps an admin mutation: enforces the admin role and converts thrown errors into results. */
async function adminAction(fn: (adminId: string) => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    return await fn(session.user.id);
  } catch (error) {
    if (error instanceof AuthorizationError) return fail(error.message);
    if (error instanceof z.ZodError) return fail(error.issues[0]?.message ?? 'Invalid input.');
    console.error('[admin action] failed', error);
    return fail('Something went wrong. Please try again.');
  }
}

const revalidateAdmin = (...paths: string[]) => {
  for (const path of ['/admin/dashboard', '/admin/audit-logs', ...paths]) revalidatePath(path);
};

/** Admins who can actually sign in: not suspended and invite accepted (an account with a password exists). */
async function countActiveAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: { role: 'ADMIN', banned: false, accounts: { some: {} }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
  });
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function changeUserRole(input: z.input<typeof ChangeRoleSchema>) {
  return adminAction(async adminId => {
    const { userId, role, specialty } = ChangeRoleSchema.parse(input);
    if (userId === adminId) return fail("You can't change your own role.");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, doctorProfile: { select: { id: true } } } });
    if (!user) return fail('User not found.');
    if (user.role === role) return fail(`User is already a ${role.toLowerCase()}.`);
    if (user.role === 'ADMIN' && (await countActiveAdmins(userId)) === 0) return fail("You can't demote the last active administrator.");
    if (role === 'DOCTOR' && !user.doctorProfile && !specialty) return fail('A specialty is required to make this user a doctor.');

    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: userId }, data: { role } });
      if (role === 'DOCTOR' && !user.doctorProfile) {
        await tx.doctorProfile.create({ data: { userId, specialty: specialty! } });
      }
      // Force re-authentication so the user starts a fresh session under the new role.
      await tx.session.deleteMany({ where: { userId } });
    });

    await recordAudit({
      actorId: adminId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: userId,
      summary: `Changed role from ${user.role} to ${role}`,
      metadata: { from: user.role, to: role },
    });

    revalidateAdmin('/admin/users', `/admin/users/${userId}`, '/admin/doctors');
    return { ok: true, message: `Role updated to ${role.toLowerCase()}.` };
  });
}

export async function suspendUser(input: z.input<typeof SuspendUserSchema>) {
  return adminAction(async adminId => {
    const { userId, reason } = SuspendUserSchema.parse(input);
    if (userId === adminId) return fail("You can't suspend your own account.");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, banned: true } });
    if (!user) return fail('User not found.');
    if (user.banned) return fail('This account is already suspended.');
    if (user.role === 'ADMIN' && (await countActiveAdmins(userId)) === 0) return fail("You can't suspend the last active administrator.");

    const [, revoked] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { banned: true, banReason: reason, bannedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    await recordAudit({
      actorId: adminId,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: userId,
      summary: `Suspended account and revoked ${revoked.count} session(s)`,
      metadata: { reason },
    });

    revalidateAdmin('/admin/users', `/admin/users/${userId}`, '/admin/doctors');
    return { ok: true, message: 'Account suspended and signed out everywhere.' };
  });
}

export async function reactivateUser(userId: string) {
  return adminAction(async adminId => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true } });
    if (!user) return fail('User not found.');
    if (!user.banned) return fail('This account is not suspended.');

    await prisma.user.update({ where: { id: userId }, data: { banned: false, banReason: null, bannedAt: null } });
    await recordAudit({ actorId: adminId, action: 'USER_REACTIVATED', entityType: 'User', entityId: userId, summary: 'Reactivated account' });

    revalidateAdmin('/admin/users', `/admin/users/${userId}`, '/admin/doctors');
    return { ok: true, message: 'Account reactivated.' };
  });
}

export async function revokeUserSessions(userId: string) {
  return adminAction(async adminId => {
    if (userId === adminId) return fail('Use “Sign out” to end your own session.');
    const { count } = await prisma.session.deleteMany({ where: { userId } });

    await recordAudit({
      actorId: adminId,
      action: 'USER_SESSIONS_REVOKED',
      entityType: 'User',
      entityId: userId,
      summary: `Revoked ${count} active session(s)`,
    });

    revalidateAdmin('/admin/users', `/admin/users/${userId}`);
    return { ok: true, message: count ? `Signed out of ${count} session(s).` : 'No active sessions to revoke.' };
  });
}

// ─── Doctors ───────────────────────────────────────────────────────────────────

async function sendStaffInvite(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: STAFF_INVITE_REDIRECT } });
}

export async function inviteDoctor(input: InviteDoctorInput) {
  return adminAction(async adminId => {
    const data = InviteDoctorSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) return fail('An account with this email already exists. Change its role from the Users page instead.');

    // The account is created without a password. The invitee chooses one through a
    // single-use emailed link, so administrators never handle clinician credentials.
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        role: 'DOCTOR',
        emailVerified: true,
        doctorProfile: {
          create: {
            specialty: data.specialty,
            licenseNumber: data.licenseNumber || null,
            yearsOfExperience: data.yearsOfExperience ?? null,
            availabilityStatus: 'OFFLINE',
            providerType: data.providerType,
            credentials: data.providerType === 'THERAPIST' ? data.credentials || null : null,
          },
        },
      },
      select: { id: true },
    });

    await sendStaffInvite(data.email);

    await recordAudit({
      actorId: adminId,
      action: 'DOCTOR_INVITED',
      entityType: 'User',
      entityId: user.id,
      summary: `Invited ${data.providerType === 'THERAPIST' ? 'therapist' : 'doctor'} (${data.specialty})`,
      metadata: { specialty: data.specialty },
    });

    revalidateAdmin('/admin/doctors', '/admin/users');
    return { ok: true, message: `Invitation sent to ${data.email}.` };
  });
}

// ─── Administrators ────────────────────────────────────────────────────────────

export async function inviteAdmin(input: InviteAdminInput) {
  return adminAction(async adminId => {
    const data = InviteAdminSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) return fail('An account with this email already exists. Change its role from its user page instead.');

    // Same flow as doctors: no password is created here. The invitee sets one
    // through a single-use emailed link, so no admin ever handles another's credentials.
    const user = await prisma.user.create({
      data: { id: randomUUID(), name: data.name, email: data.email, role: 'ADMIN', emailVerified: true },
      select: { id: true },
    });

    await sendStaffInvite(data.email);

    await recordAudit({
      actorId: adminId,
      action: 'ADMIN_INVITED',
      entityType: 'User',
      entityId: user.id,
      summary: 'Invited administrator',
    });

    revalidateAdmin('/admin/users');
    return { ok: true, message: `Invitation sent to ${data.email}.` };
  });
}

/** Resends the set-password email to an invited doctor or administrator who hasn't activated yet. */
export async function resendStaffInvite(userId: string) {
  return adminAction(async adminId => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, banned: true, _count: { select: { accounts: true } } },
    });
    if (!user || (user.role !== 'DOCTOR' && user.role !== 'ADMIN')) return fail('Invitation not found.');
    if (user.banned) return fail('This account is suspended. Reactivate it first.');
    if (user._count.accounts > 0) return fail('This account has already been activated.');

    await sendStaffInvite(user.email);
    await recordAudit({
      actorId: adminId,
      action: user.role === 'ADMIN' ? 'ADMIN_INVITE_RESENT' : 'DOCTOR_INVITE_RESENT',
      entityType: 'User',
      entityId: userId,
      summary: `Resent ${user.role === 'ADMIN' ? 'administrator' : 'doctor'} invitation`,
    });

    revalidateAdmin('/admin/doctors', '/admin/users', `/admin/users/${userId}`);
    return { ok: true, message: 'Invitation resent.' };
  });
}

export async function updateDoctorAvailability(userId: string, availability: z.input<typeof AvailabilitySchema>) {
  return adminAction(async adminId => {
    const status = AvailabilitySchema.parse(availability);
    const profile = await prisma.doctorProfile.findUnique({ where: { userId }, select: { availabilityStatus: true } });
    if (!profile) return fail('Doctor profile not found.');
    if (profile.availabilityStatus === status) return { ok: true, message: 'No change.' };

    await prisma.doctorProfile.update({ where: { userId }, data: { availabilityStatus: status } });
    await recordAudit({
      actorId: adminId,
      action: 'DOCTOR_AVAILABILITY_CHANGED',
      entityType: 'DoctorProfile',
      entityId: userId,
      summary: `Availability changed from ${profile.availabilityStatus} to ${status}`,
      metadata: { from: profile.availabilityStatus, to: status },
    });

    revalidateAdmin('/admin/doctors');
    return { ok: true, message: 'Availability updated.' };
  });
}

// ─── Appointments ──────────────────────────────────────────────────────────────

export async function reassignAppointment(input: z.input<typeof ReassignAppointmentSchema>) {
  return adminAction(async adminId => {
    const { appointmentId, doctorId } = ReassignAppointmentSchema.parse(input);

    const [appointment, doctor] = await Promise.all([
      prisma.appointment.findUnique({ where: { id: appointmentId }, select: { status: true, doctorId: true, patientId: true, scheduledAt: true } }),
      prisma.user.findFirst({ where: { id: doctorId, role: 'DOCTOR', banned: false, accounts: { some: {} } }, select: { id: true, name: true } }),
    ]);
    if (!appointment) return fail('Appointment not found.');
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) return fail('Only open appointments can be reassigned.');
    if (!doctor) return fail('Choose an active doctor who has accepted their invitation.');
    if (appointment.doctorId === doctorId) return fail('This doctor is already assigned.');

    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { doctorId } }),
      // The chat thread is tied to the patient/doctor pair, so detach it from the previous doctor's conversation.
      prisma.conversation.updateMany({ where: { activeAppointmentId: appointmentId }, data: { activeAppointmentId: null } }),
    ]);

    const when = appointment.scheduledAt.toLocaleDateString('en-US', { dateStyle: 'medium' });
    await Promise.all([
      createNotification({ userId: doctorId, type: 'APPOINTMENT', title: 'New appointment assigned', message: `An appointment on ${when} has been assigned to you.` }),
      createNotification({ userId: appointment.patientId, type: 'APPOINTMENT', title: 'Your doctor has changed', message: `${doctor.name} will now see you for your appointment on ${when}.` }),
      appointment.doctorId
        ? createNotification({ userId: appointment.doctorId, type: 'APPOINTMENT', title: 'Appointment reassigned', message: `Your appointment on ${when} was reassigned to another doctor.` })
        : null,
    ]);

    await recordAudit({
      actorId: adminId,
      action: 'APPOINTMENT_REASSIGNED',
      entityType: 'Appointment',
      entityId: appointmentId,
      summary: appointment.doctorId ? 'Reassigned appointment to a different doctor' : 'Assigned appointment to a doctor',
      metadata: { fromDoctorId: appointment.doctorId, toDoctorId: doctorId },
    });

    revalidateAdmin('/admin/appointments', `/admin/appointments/${appointmentId}`, '/admin/doctors');
    return { ok: true, message: `Assigned to ${doctor.name}.` };
  });
}

export async function cancelAppointment(input: z.input<typeof CancelAppointmentSchema>) {
  return adminAction(async adminId => {
    const { appointmentId, reason } = CancelAppointmentSchema.parse(input);
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { status: true, doctorId: true, patientId: true, scheduledAt: true } });
    if (!appointment) return fail('Appointment not found.');
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) return fail('Only open appointments can be cancelled.');

    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED' } }),
      prisma.conversation.updateMany({ where: { activeAppointmentId: appointmentId }, data: { activeAppointmentId: null } }),
    ]);

    const when = appointment.scheduledAt.toLocaleDateString('en-US', { dateStyle: 'medium' });
    await Promise.all([
      createNotification({ userId: appointment.patientId, type: 'APPOINTMENT', title: 'Appointment cancelled', message: `Your appointment on ${when} was cancelled. Reason: ${reason}` }),
      appointment.doctorId
        ? createNotification({ userId: appointment.doctorId, type: 'APPOINTMENT', title: 'Appointment cancelled', message: `The appointment on ${when} was cancelled by an administrator.` })
        : null,
    ]);

    await recordAudit({
      actorId: adminId,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appointmentId,
      summary: 'Cancelled appointment',
      metadata: { reason },
    });

    revalidateAdmin('/admin/appointments', `/admin/appointments/${appointmentId}`);
    return { ok: true, message: 'Appointment cancelled and both parties notified.' };
  });
}

// ─── Clinic settings ───────────────────────────────────────────────────────────

const CLINIC_FIELD_LABELS: Record<string, string> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  addressLine1: 'address',
  addressLine2: 'address',
  city: 'address',
  state: 'address',
  postalCode: 'address',
  country: 'address',
  mapUrl: 'map link',
  arrivalInstructions: 'arrival instructions',
  timezone: 'timezone',
  openingHours: 'opening hours',
  inPersonEnabled: 'visit types',
  videoEnabled: 'visit types',
  emergencyNumber: 'emergency number',
};

export async function updateClinicSettings(input: ClinicSettingsInput) {
  return adminAction(async adminId => {
    const data = ClinicSettingsSchema.parse(input);
    const current = await getClinicSettings();

    const changed = [
      ...new Set(
        (Object.keys(CLINIC_FIELD_LABELS) as (keyof typeof data)[])
          .filter(key => JSON.stringify(data[key] ?? null) !== JSON.stringify((current as Record<string, unknown>)[key] ?? null))
          .map(key => CLINIC_FIELD_LABELS[key]),
      ),
    ];
    if (changed.length === 0) return { ok: true, message: 'No changes to save.' };

    await prisma.clinicSettings.upsert({
      where: { id: CLINIC_SETTINGS_ID },
      create: { id: CLINIC_SETTINGS_ID, ...data, updatedById: adminId },
      update: { ...data, updatedById: adminId },
    });

    await recordAudit({
      actorId: adminId,
      action: 'CLINIC_SETTINGS_UPDATED',
      entityType: 'ClinicSettings',
      entityId: CLINIC_SETTINGS_ID,
      summary: `Updated clinic settings: ${changed.join(', ')}`,
      metadata: { fields: changed },
    });

    // Settings appear across the app (booking, chat, appointments), so refresh everything.
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Clinic settings saved.' };
  });
}
