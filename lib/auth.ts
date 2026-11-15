import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';

import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { resetPasswordEmail, sendEmail, staffInviteEmail, verificationEmail } from '@/lib/email';

/** Staff invitations reuse the password-reset flow with this marker on the redirect path. */
export const STAFF_INVITE_REDIRECT = '/auth/reset-password?invite=1';

const isStaffInviteUrl = (url: string) => {
  try {
    return new URL(url).searchParams.get('callbackURL') === STAFF_INVITE_REDIRECT;
  } catch {
    return false;
  }
};

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
      const role = (user as { role?: string }).role ?? 'DOCTOR';
      const content = isStaffInviteUrl(url) ? staffInviteEmail({ name: user.name, url, role }) : resetPasswordEmail({ name: user.name, url });
      await sendEmail({ to: user.email, ...content });
    },
    onPasswordReset: async ({ user }) => {
      await recordAudit({
        actorId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        summary: 'Password reset via emailed link; all sessions revoked',
      });
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
      banned: {
        type: 'boolean',
        required: false,
        input: false,
        defaultValue: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async user => {
          await recordAudit({
            actorId: user.id,
            action: 'USER_SIGNED_UP',
            entityType: 'User',
            entityId: user.id,
            summary: 'Account created',
          });
        },
      },
    },
    session: {
      create: {
        // Suspended accounts can't sign in by any method (password, OAuth, email-verification auto sign-in).
        before: async session => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { banned: true } });
          if (user?.banned) {
            throw new APIError('FORBIDDEN', {
              message: 'This account has been suspended. Contact support for help.',
              code: 'BANNED_USER',
            });
          }
        },
        after: async session => {
          await recordAudit({
            actorId: session.userId,
            action: 'USER_SIGNED_IN',
            entityType: 'Session',
            entityId: session.id,
            summary: 'Signed in',
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          });
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
