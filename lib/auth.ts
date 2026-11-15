import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';

import { prisma } from '@/lib/prisma';
import { resetPasswordEmail, sendEmail, verificationEmail } from '@/lib/email';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Google sign-in is only offered when OAuth credentials are configured. */
export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: process.env.BETTER_AUTH_URL!,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Patient records are sensitive: an account must prove ownership of its email first.
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    // A password reset signs the user out everywhere (e.g. a stolen session can't survive it).
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...resetPasswordEmail({ name: user.name, url }) });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // Re-send the link when an unverified user tries to sign in.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...verificationEmail({ name: user.name, url }) });
    },
  },

  socialProviders: isGoogleAuthEnabled
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          prompt: 'select_account',
        },
      }
    : undefined,

  rateLimit: {
    // Better Auth only enables rate limiting in production by default.
    enabled: process.env.NODE_ENV === 'production',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/request-password-reset': { window: 300, max: 3 },
      '/reset-password': { window: 60, max: 5 },
      '/send-verification-email': { window: 300, max: 3 },
    },
  },

  user: {
    additionalFields: {
      role: {
        type: ['PATIENT', 'DOCTOR', 'ADMIN'],
        required: false,
        // Never accept a role from the client — roles are assigned server-side only.
        input: false,
        defaultValue: 'PATIENT',
      },
    },
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
