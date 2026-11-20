'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/audit';
import { authFailure, requireRole } from '@/lib/authz';
import { ClinicianProfileSchema, type ClinicianProfileInput } from '@/validations/clinician';

const FIELD_LABELS: Record<string, string> = {
  specialty: 'specialty',
  bio: 'bio',
  yearsOfExperience: 'experience',
  credentials: 'credentials',
  availabilityStatus: 'availability',
  workingHours: 'working hours',
};

/** A clinician updates their own profile and working hours. Every change is audit-logged. */
export const updateMyClinicianProfile = async (input: ClinicianProfileInput) => {
  try {
    const session = await requireRole('DOCTOR');
    const parsed = ClinicianProfileSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Please check the form.' };
    const data = parsed.data;

    const current = await prisma.doctorProfile.findUnique({ where: { userId: session.user.id } });
    if (!current) return { success: false as const, message: 'Your clinician profile hasn’t been set up yet. Contact an administrator.' };

    const changed = (Object.keys(FIELD_LABELS) as (keyof typeof data)[])
      .filter(key => JSON.stringify(data[key] ?? null) !== JSON.stringify((current as Record<string, unknown>)[key] ?? null))
      .map(key => FIELD_LABELS[key]);
    if (changed.length === 0) return { success: true as const, message: 'No changes to save.' };

    await prisma.doctorProfile.update({
      where: { userId: session.user.id },
      data: {
        specialty: data.specialty,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        // Credentials are only shown for therapists; doctors are shown as "Dr. Name".
        credentials: current.providerType === 'THERAPIST' ? data.credentials : current.credentials,
        availabilityStatus: data.availabilityStatus,
        // null = follow the clinic's opening hours (stored as SQL NULL).
        workingHours: data.workingHours === null ? Prisma.DbNull : data.workingHours,
      },
    });

    await recordAudit({
      actorId: session.user.id,
      action: 'CLINICIAN_PROFILE_UPDATED',
      entityType: 'DoctorProfile',
      entityId: current.id,
      summary: `Updated own profile: ${changed.join(', ')}`,
      metadata: { fields: changed },
    });

    revalidatePath('/doctor/profile');
    revalidatePath('/doctor/dashboard');
    return { success: true as const, message: 'Profile saved.' };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return { ...failure, success: false as const };
    console.error('[updateMyClinicianProfile]', error);
    return { success: false as const, message: 'Could not save your profile. Please try again.' };
  }
};
