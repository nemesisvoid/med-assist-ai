import * as z from 'zod';

/** Matches Better Auth's emailAndPassword min/max lengths in lib/auth.ts. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine(d => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords don’t match.' })
  .refine(d => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Choose a password different from your current one.' });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform(v => (v === '' ? null : v))
    .nullable();

/**
 * Health details a patient can update themselves. Identity fields (name, date of
 * birth, sex, medical record number) are changed by the clinic, not here.
 */
export const PatientHealthProfileSchema = z.object({
  genotype: z.string().trim().min(1, 'Choose your genotype.').max(10),
  bloodGroup: z.string().trim().min(1, 'Choose your blood group.').max(10),
  allergies: optionalText(1000),
  medications: optionalText(1000),
  medicalHistory: optionalText(2000),
  emergencyContact: optionalText(200),
  insuranceProvider: optionalText(120),
});

export type PatientHealthProfileInput = z.input<typeof PatientHealthProfileSchema>;
