import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { AuditAction, Prisma } from '@/generated/prisma/client';

export type AuditEntry = {
  actorId?: string | null;
  action: AuditAction;
  entityType: 'User' | 'DoctorProfile' | 'Appointment' | 'Session' | 'PatientRecord' | 'MessageAttachment' | 'Message' | 'ClinicSettings';
  entityId?: string | null;
  /** Human-readable, PHI-free description, e.g. "Changed role from PATIENT to ADMIN". */
  summary: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function requestContext(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    return { ipAddress: forwarded || h.get('x-real-ip'), userAgent: h.get('user-agent') };
  } catch {
    // Called outside a request scope (e.g. scripts) — no request metadata available.
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Records an audit event. Auditing must never break the action being audited,
 * so failures are logged and swallowed.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    // Auth hooks pass request metadata explicitly; server actions read it from the request.
    const ctx = entry.ipAddress || entry.userAgent ? null : await requestContext();
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress ?? ctx?.ipAddress ?? null,
        userAgent: entry.userAgent ?? ctx?.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to record event', entry.action, error);
  }
}
