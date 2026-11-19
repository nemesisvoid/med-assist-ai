/**
 * Read-side data access for the admin console.
 *
 * These are plain server functions (not `'use server'` actions) so they are not exposed
 * as client-callable endpoints; they are only invoked from admin server components.
 * Each still re-checks the admin role as defence in depth.
 *
 * Minimum-necessary principle: admin views expose account and operational metadata
 * only. Clinical content (intake forms, symptoms, SOAP notes, prescriptions) is never
 * selected here.
 */
import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import type { AppointmentPriority, AppointmentStatus, AuditAction, DoctorAvailabilityStatus, Prisma, Role } from '@/generated/prisma/client';

export const ADMIN_PAGE_SIZE = 10;

export const OPEN_APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING_INTAKE', 'READY_FOR_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'NOTES_GENERATED'];

export const HIGH_RISK_OPEN_WHERE: Prisma.AppointmentWhereInput = {
  status: { in: OPEN_APPOINTMENT_STATUSES },
  OR: [{ riskLevel: 'HIGH' }, { priority: { in: ['HIGH', 'CRITICAL'] } }],
};

export type TrendRange = '7d' | '30d' | '90d';
export const TREND_RANGE_DAYS: Record<TrendRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

export type Paginated<T> = { items: T[]; total: number; page: number; pageCount: number };

const toPage = (page?: number) => (Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1);
const paginate = (page: number) => ({ skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE });
const pageCount = (total: number) => Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

/** Percentage change between two periods; null when there is no baseline. */
const percentChange = (current: number, previous: number) => (previous === 0 ? null : Math.round(((current - previous) / previous) * 100));

// ─── Overview ──────────────────────────────────────────────────────────────────

export async function getAdminOverview() {
  await requireAdmin();

  const now = new Date();
  const last30 = subDays(now, 30);
  const prev30 = subDays(now, 60);

  const [
    totalPatients,
    newPatients,
    newPatientsPrev,
    totalDoctors,
    availableDoctors,
    appointments,
    appointmentsPrev,
    completed,
    cancelled,
    openHighRisk,
    unassigned,
    suspended,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'PATIENT' } }),
    prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: prev30, lt: last30 } } }),
    prisma.user.count({ where: { role: 'DOCTOR', banned: false } }),
    prisma.doctorProfile.count({ where: { availabilityStatus: 'AVAILABLE', user: { banned: false } } }),
    prisma.appointment.count({ where: { createdAt: { gte: last30 } } }),
    prisma.appointment.count({ where: { createdAt: { gte: prev30, lt: last30 } } }),
    prisma.appointment.count({ where: { status: 'COMPLETED', updatedAt: { gte: last30 } } }),
    prisma.appointment.count({ where: { status: 'CANCELLED', updatedAt: { gte: last30 } } }),
    prisma.appointment.count({ where: HIGH_RISK_OPEN_WHERE }),
    prisma.appointment.count({ where: { doctorId: null, status: { in: OPEN_APPOINTMENT_STATUSES } } }),
    prisma.user.count({ where: { banned: true } }),
  ]);

  const closed = completed + cancelled;

  return {
    patients: { total: totalPatients, new: newPatients, change: percentChange(newPatients, newPatientsPrev) },
    doctors: { total: totalDoctors, available: availableDoctors },
    appointments: { last30: appointments, change: percentChange(appointments, appointmentsPrev) },
    completionRate: closed === 0 ? null : Math.round((completed / closed) * 100),
    openHighRisk,
    unassigned,
    suspended,
  };
}

/** Appointments per scheduled day, split into all scheduled vs. completed. */
export async function getAppointmentTrend(range: TrendRange) {
  await requireAdmin();

  const days = TREND_RANGE_DAYS[range];
  const start = startOfDay(subDays(new Date(), days - 1));
  const end = new Date();

  const rows = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    select: { scheduledAt: true, status: true },
  });

  const buckets = new Map(eachDayOfInterval({ start, end }).map(day => [format(day, 'yyyy-MM-dd'), { scheduled: 0, completed: 0 }]));
  for (const row of rows) {
    const bucket = buckets.get(format(row.scheduledAt, 'yyyy-MM-dd'));
    if (!bucket) continue;
    bucket.scheduled++;
    if (row.status === 'COMPLETED') bucket.completed++;
  }

  return [...buckets.entries()].map(([date, counts]) => ({ date, ...counts }));
}

export async function getAppointmentStatusBreakdown() {
  await requireAdmin();
  const groups = await prisma.appointment.groupBy({ by: ['status'], _count: { _all: true } });
  const order: AppointmentStatus[] = [...OPEN_APPOINTMENT_STATUSES, 'COMPLETED', 'CANCELLED'];
  return order.map(status => ({ status, count: groups.find(g => g.status === status)?._count._all ?? 0 }));
}

/** Per-doctor counts of open and completed appointments, grouped in one query. */
async function getDoctorAppointmentCounts(doctorIds: string[]) {
  if (doctorIds.length === 0) return new Map<string, { open: number; completed: number; total: number }>();
  const groups = await prisma.appointment.groupBy({
    by: ['doctorId', 'status'],
    where: { doctorId: { in: doctorIds } },
    _count: { _all: true },
  });

  const counts = new Map<string, { open: number; completed: number; total: number }>();
  for (const g of groups) {
    if (!g.doctorId) continue;
    const entry = counts.get(g.doctorId) ?? { open: 0, completed: 0, total: 0 };
    entry.total += g._count._all;
    if (g.status === 'COMPLETED') entry.completed += g._count._all;
    if (OPEN_APPOINTMENT_STATUSES.includes(g.status)) entry.open += g._count._all;
    counts.set(g.doctorId, entry);
  }
  return counts;
}

export async function getDoctorWorkload(limit = 5) {
  await requireAdmin();
  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR', banned: false },
    select: { id: true, name: true, image: true, doctorProfile: { select: { specialty: true, availabilityStatus: true, imageUrl: true } } },
  });
  const counts = await getDoctorAppointmentCounts(doctors.map(d => d.id));

  return doctors
    .map(d => ({ ...d, ...(counts.get(d.id) ?? { open: 0, completed: 0, total: 0 }) }))
    .sort((a, b) => b.open - a.open || b.total - a.total)
    .slice(0, limit);
}

export async function getRecentAuditEvents(take = 8) {
  await requireAdmin();
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export type UserStatusFilter = 'active' | 'suspended' | 'unverified';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  emailVerified: true,
  banned: true,
  createdAt: true,
  doctorProfile: { select: { specialty: true } },
  patientProfile: { select: { medicalRecordNumber: true } },
  _count: { select: { accounts: true } },
} satisfies Prisma.UserSelect;

type UserListItem = Prisma.UserGetPayload<{ select: typeof userListSelect }> & { lastSignInAt: Date | null; invitePending: boolean };

export async function listUsers(params: {
  q?: string;
  role?: Role;
  status?: UserStatusFilter;
  page?: number;
}): Promise<Paginated<UserListItem>> {
  await requireAdmin();
  const page = toPage(params.page);

  const where: Prisma.UserWhereInput = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.status === 'suspended' ? { banned: true } : {}),
    ...(params.status === 'active' ? { banned: false, emailVerified: true } : {}),
    ...(params.status === 'unverified' ? { banned: false, emailVerified: false } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
            { patientProfile: { medicalRecordNumber: { contains: params.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userListSelect, orderBy: { createdAt: 'desc' }, ...paginate(page) }),
    prisma.user.count({ where }),
  ]);

  // Sessions are deleted on sign-out/expiry, so the audit log is the reliable source for last sign-in.
  const signIns = users.length
    ? await prisma.auditLog.groupBy({
        by: ['actorId'],
        where: { action: 'USER_SIGNED_IN', actorId: { in: users.map(u => u.id) } },
        _max: { createdAt: true },
      })
    : [];
  const lastSignIn = new Map(signIns.map(s => [s.actorId, s._max.createdAt]));

  const items = users.map(u => ({
    ...u,
    lastSignInAt: lastSignIn.get(u.id) ?? null,
    // Invited staff (doctors and admins) have no login method until they set a password.
    invitePending: (u.role === 'DOCTOR' || u.role === 'ADMIN') && u._count.accounts === 0,
  }));

  return { items, total, page, pageCount: pageCount(total) };
}

export async function getUserRoleCounts() {
  await requireAdmin();
  const [groups, suspended] = await Promise.all([prisma.user.groupBy({ by: ['role'], _count: { _all: true } }), prisma.user.count({ where: { banned: true } })]);
  const byRole = (role: Role) => groups.find(g => g.role === role)?._count._all ?? 0;
  return { PATIENT: byRole('PATIENT'), DOCTOR: byRole('DOCTOR'), ADMIN: byRole('ADMIN'), suspended };
}

export async function getUserDetail(userId: string) {
  await requireAdmin();
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      banned: true,
      banReason: true,
      bannedAt: true,
      createdAt: true,
      updatedAt: true,
      lastSeen: true,
      doctorProfile: { select: { specialty: true, licenseNumber: true, yearsOfExperience: true, availabilityStatus: true } },
      patientProfile: { select: { medicalRecordNumber: true, insuranceProvider: true } },
      accounts: { select: { providerId: true, createdAt: true } },
      sessions: {
        where: { expiresAt: { gt: now } },
        select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { patientAppointments: true, doctorAppointments: true } },
    },
  });
  if (!user) return null;

  const activity = await prisma.auditLog.findMany({
    where: { OR: [{ actorId: userId }, { entityType: 'User', entityId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { actor: { select: { id: true, name: true } } },
  });

  return { user, activity };
}

// ─── Doctors ───────────────────────────────────────────────────────────────────

export async function listDoctors(params: { q?: string; availability?: DoctorAvailabilityStatus }) {
  await requireAdmin();
  const doctors = await prisma.user.findMany({
    where: {
      role: 'DOCTOR',
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' } },
              { email: { contains: params.q, mode: 'insensitive' } },
              { doctorProfile: { specialty: { contains: params.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(params.availability ? { doctorProfile: { availabilityStatus: params.availability } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      banned: true,
      createdAt: true,
      doctorProfile: { select: { id: true, specialty: true, licenseNumber: true, yearsOfExperience: true, availabilityStatus: true, imageUrl: true } },
      accounts: { select: { providerId: true } },
    },
    orderBy: { name: 'asc' },
  });

  const counts = await getDoctorAppointmentCounts(doctors.map(d => d.id));
  return doctors.map(({ accounts, ...d }) => ({
    ...d,
    // An invited doctor has no login method until they set a password from their invite.
    invitePending: accounts.length === 0,
    ...(counts.get(d.id) ?? { open: 0, completed: 0, total: 0 }),
  }));
}

export async function getAssignableDoctors() {
  await requireAdmin();
  const doctors = await prisma.user.findMany({
    // Only doctors who can actually sign in (invite accepted) can take appointments.
    where: { role: 'DOCTOR', banned: false, doctorProfile: { isNot: null }, accounts: { some: {} } },
    select: { id: true, name: true, doctorProfile: { select: { specialty: true, availabilityStatus: true } } },
    orderBy: { name: 'asc' },
  });
  const counts = await getDoctorAppointmentCounts(doctors.map(d => d.id));
  return doctors.map(d => ({
    id: d.id,
    name: d.name,
    specialty: d.doctorProfile?.specialty ?? '—',
    availability: d.doctorProfile?.availabilityStatus ?? 'OFFLINE',
    openAppointments: counts.get(d.id)?.open ?? 0,
  }));
}

// ─── Appointments ──────────────────────────────────────────────────────────────

export type AssignmentFilter = 'unassigned' | 'assigned';

export async function listAppointments(params: {
  q?: string;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  assignment?: AssignmentFilter;
  /** 'high' = open and AI-flagged high risk or high/critical priority (matches the dashboard tile). */
  risk?: 'high';
  page?: number;
}) {
  await requireAdmin();
  const page = toPage(params.page);

  const where: Prisma.AppointmentWhereInput = {
    AND: [
      params.risk === 'high' ? HIGH_RISK_OPEN_WHERE : {},
      params.status ? { status: params.status } : {},
      params.priority ? { priority: params.priority } : {},
      params.assignment === 'unassigned' ? { doctorId: null } : {},
      params.assignment === 'assigned' ? { doctorId: { not: null } } : {},
      params.q
        ? {
            OR: [
              { patient: { name: { contains: params.q, mode: 'insensitive' } } },
              { doctor: { name: { contains: params.q, mode: 'insensitive' } } },
              { appointmentType: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      select: {
        id: true,
        appointmentType: true,
        scheduledAt: true,
        scheduledTime: true,
        status: true,
        priority: true,
        riskLevel: true,
        createdAt: true,
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, doctorProfile: { select: { specialty: true } } } },
      },
      orderBy: { scheduledAt: 'desc' },
      ...paginate(page),
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, total, page, pageCount: pageCount(total) };
}

// ─── Audit log ─────────────────────────────────────────────────────────────────

export async function listAuditLogs(params: { action?: AuditAction; q?: string; page?: number }) {
  await requireAdmin();
  const page = toPage(params.page);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.action ? { action: params.action } : {}),
    ...(params.q
      ? {
          OR: [
            { actor: { name: { contains: params.q, mode: 'insensitive' } } },
            { actor: { email: { contains: params.q, mode: 'insensitive' } } },
            { summary: { contains: params.q, mode: 'insensitive' } },
            { entityId: params.q },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      ...paginate(page),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageCount: pageCount(total) };
}

/**
 * Operational view of a single appointment for administrators.
 * Only presence/timestamps of clinical artefacts are selected — never their content.
 */
export async function getAppointmentDetail(appointmentId: string) {
  await requireAdmin();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      appointmentType: true,
      scheduledAt: true,
      scheduledTime: true,
      durationMinutes: true,
      status: true,
      priority: true,
      riskLevel: true,
      requiresFollowUp: true,
      createdAt: true,
      updatedAt: true,
      patient: { select: { id: true, name: true, email: true, image: true, banned: true, patientProfile: { select: { medicalRecordNumber: true } } } },
      doctor: {
        select: { id: true, name: true, email: true, image: true, banned: true, doctorProfile: { select: { specialty: true, availabilityStatus: true, imageUrl: true } } },
      },
      intakeForm: { select: { createdAt: true } },
      clinicalNote: { select: { createdAt: true, updatedAt: true, _count: { select: { prescriptions: true } } } },
      followUp: { select: { recommendedDate: true, nextAppointmentId: true } },
      priorFollowUp: { select: { appointmentId: true } },
      activeConversation: { select: { chatLocksAt: true } },
      _count: { select: { messages: true } },
    },
  });
  if (!appointment) return null;

  const history = await prisma.auditLog.findMany({
    where: { entityType: 'Appointment', entityId: appointmentId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { actor: { select: { id: true, name: true } } },
  });

  return { appointment, history };
}
