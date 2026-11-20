import * as z from 'zod';
import { WEEKDAYS } from '@/lib/clinic-hours';
import { dayHoursSchema } from '@/validations/clinic';

export const weeklyHoursSchema = z.object(
  Object.fromEntries(WEEKDAYS.map(d => [d, dayHoursSchema])) as Record<(typeof WEEKDAYS)[number], typeof dayHoursSchema>,
);

/** What a clinician can edit about themselves. Provider type and licence stay admin-managed. */
export const ClinicianProfileSchema = z.object({
  specialty: z.string().trim().min(2, { message: 'Specialty is required' }).max(80),
  bio: z
    .string()
    .trim()
    .max(1000, { message: 'Keep your bio under 1000 characters' })
    .transform(v => (v === '' ? null : v))
    .nullable(),
  yearsOfExperience: z
    .union([z.number(), z.string()])
    .transform(v => (v === '' ? null : Number(v)))
    .nullable()
    .refine(v => v === null || (Number.isInteger(v) && v >= 0 && v <= 70), { message: 'Enter a whole number of years (0–70)' }),
  credentials: z
    .string()
    .trim()
    .max(30)
    .transform(v => (v === '' ? null : v))
    .nullable(),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_LEAVE']),
  /** null = follow the clinic's opening hours */
  workingHours: weeklyHoursSchema.nullable(),
});

export type ClinicianProfileInput = z.input<typeof ClinicianProfileSchema>;
