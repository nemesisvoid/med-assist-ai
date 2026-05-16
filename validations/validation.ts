import * as z from 'zod';

export const LoginFormSchema = z.object({
  mode: z.literal('login'),
  email: z.email({ message: 'Enter a valid email' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const CreateAccountSchema = z.object({
  mode: z.literal('create'),
  name: z.string().min(5, { message: 'Full Name is required' }),
  email: z.email({ message: 'Enter a valid email' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const AuthSchema = z.discriminatedUnion('mode', [LoginFormSchema, CreateAccountSchema]);

export type AuthFormData = z.infer<typeof AuthSchema>;

export const AppointmentFormSchema = z.object({
  appointmentReason: z.string().min(1),
  scheduledAt: z.date(),
  scheduledTime: z.string().min(1),
  appointmentType: z.string().min(1),
  // duration: z.string().min(1),
  doctor: z.string().min(1),
  symptoms: z.string().optional().nullish(),
});

export const PatientProfileFormSchema = z.object({
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  genotype: z.string().min(1),
  bloodGroup: z.string().min(1),
  allergies: z.string().optional().nullish(),
  medications: z.string().optional().nullish(),
  medicalHistory: z.string().optional().nullish(),
  emergencyContact: z.string().optional().nullish(),
  insuranceProvider: z.string().optional().nullish(),
});

export const PatientInTakeFormSchema = z.object({
  appointmentId: z.string(),
  complaint: z.string(),
  currentSymptoms: z.string().min(5, { message: 'Current symptoms is required' }),
  allergies: z.string().optional().nullish(),
  additionalNotes: z.string().optional().nullish(),
  medication: z.string().optional().nullish(),
  painLevel: z.string().optional().nullish(),
});
