import * as z from 'zod';

export const RoleSchema = z.enum(['PATIENT', 'DOCTOR', 'ADMIN']);
export const AvailabilitySchema = z.enum(['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_LEAVE']);

export const ChangeRoleSchema = z
  .object({
    userId: z.string().min(1),
    role: RoleSchema,
    /** Required when promoting a user without a doctor profile to DOCTOR. */
    specialty: z.string().trim().max(80).optional(),
  })
  .strict();

export const SuspendUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(5, { message: 'Give a short reason (at least 5 characters)' }).max(500),
});

export const InviteDoctorSchema = z.object({
  name: z.string().trim().min(2, { message: 'Full name is required' }).max(100),
  email: z.email({ message: 'Enter a valid email' }).transform(v => v.toLowerCase()),
  providerType: z.enum(['DOCTOR', 'THERAPIST']).default('DOCTOR'),
  /** Post-nominal credentials for therapists, e.g. "LMFT", "PsyD". */
  credentials: z.string().trim().max(30).optional().or(z.literal('')),
  specialty: z.string().trim().min(2, { message: 'Specialty is required' }).max(80),
  licenseNumber: z.string().trim().max(40).optional().or(z.literal('')),
  yearsOfExperience: z.coerce.number().int().min(0).max(70).optional(),
});

export const InviteAdminSchema = z.object({
  name: z.string().trim().min(2, { message: 'Full name is required' }).max(100),
  email: z.email({ message: 'Enter a valid email' }).transform(v => v.toLowerCase()),
});

export const ReassignAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  doctorId: z.string().min(1, { message: 'Choose a doctor' }),
});

export const CancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().trim().min(5, { message: 'Give a short reason (at least 5 characters)' }).max(500),
});

export type InviteDoctorInput = z.input<typeof InviteDoctorSchema>;
export type InviteAdminInput = z.input<typeof InviteAdminSchema>;
