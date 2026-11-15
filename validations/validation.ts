import * as z from 'zod';

export const LoginFormSchema = z.object({
  mode: z.literal('login'),
  email: z.email({ message: 'Enter a valid email' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const NewPasswordField = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be at most 128 characters' });

export const CreateAccountSchema = z.object({
  mode: z.literal('create'),
  name: z.string().trim().min(2, { message: 'Full name is required' }).max(100),
  email: z.email({ message: 'Enter a valid email' }),
  password: NewPasswordField,
});

export const AuthSchema = z.discriminatedUnion('mode', [LoginFormSchema, CreateAccountSchema]);

export type AuthFormData = z.infer<typeof AuthSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email({ message: 'Enter a valid email' }),
});

export const ResetPasswordSchema = z
  .object({
    password: NewPasswordField,
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

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
