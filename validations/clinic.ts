import * as z from 'zod';
import { WEEKDAYS, isValidTime } from '@/lib/clinic-hours';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Keep this under ${max} characters` })
    .transform(v => (v === '' ? null : v))
    .nullable();

export const dayHoursSchema = z
  .object({ open: z.string(), close: z.string() })
  .nullable()
  .refine(v => v === null || (isValidTime(v.open) && isValidTime(v.close)), { message: 'Use times like 09:00' })
  .refine(v => v === null || v.open < v.close, { message: 'Closing time must be after opening time' });

const isKnownTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const ClinicSettingsSchema = z
  .object({
    name: z.string().trim().min(2, { message: 'Clinic name is required' }).max(100),
    phone: optionalText(40),
    email: z
      .string()
      .trim()
      .transform(v => (v === '' ? null : v.toLowerCase()))
      .nullable()
      .refine(v => v === null || z.email().safeParse(v).success, { message: 'Enter a valid email' }),
    addressLine1: optionalText(120),
    addressLine2: optionalText(120),
    city: optionalText(80),
    state: optionalText(80),
    postalCode: optionalText(20),
    country: optionalText(80),
    mapUrl: z
      .string()
      .trim()
      .transform(v => (v === '' ? null : v))
      .nullable()
      .refine(v => v === null || /^https:\/\/\S+$/i.test(v), { message: 'Use a full https:// link' }),
    arrivalInstructions: optionalText(500),
    timezone: z.string().refine(isKnownTimezone, { message: 'Choose a valid timezone' }),
    openingHours: z.object(Object.fromEntries(WEEKDAYS.map(d => [d, dayHoursSchema])) as Record<(typeof WEEKDAYS)[number], typeof dayHoursSchema>),
    inPersonEnabled: z.boolean(),
    videoEnabled: z.boolean(),
    emergencyNumber: z
      .string()
      .trim()
      .transform(v => (v === '' ? null : v))
      .nullable()
      .refine(v => v === null || /^[0-9+()\-\s]{2,20}$/.test(v), { message: 'Use digits only, e.g. 112' }),
  })
  .refine(v => v.inPersonEnabled || v.videoEnabled, {
    message: 'Offer at least one visit type',
    path: ['videoEnabled'],
  });

export type ClinicSettingsInput = z.input<typeof ClinicSettingsSchema>;
