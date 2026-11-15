import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './auth';

export const authClient = createAuthClient({
  // Falls back to the current origin when unset (the auth API is served by this Next.js app).
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

/** Maps Better Auth error codes to copy that is safe and helpful to show users. */
export function getAuthErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';

  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Invalid email or password.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email address. We just sent you a new verification link.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with this email already exists. Try signing in instead.';
    case 'PASSWORD_TOO_SHORT':
      return 'Password must be at least 8 characters.';
    case 'PASSWORD_TOO_LONG':
      return 'Password is too long.';
    case 'INVALID_TOKEN':
      return 'This link is invalid or has expired. Please request a new one.';
    case 'BANNED_USER':
      return 'This account has been suspended. Contact support for help.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}
