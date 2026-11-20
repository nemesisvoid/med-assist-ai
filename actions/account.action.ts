'use server';

/**
 * Account settings for any signed-in user (patients and clinicians).
 * The account is always the signed-in user; nothing here takes a user ID from the browser.
 */

import { headers } from 'next/headers';
import { after } from 'next/server';
import { APIError } from 'better-auth/api';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { authFailure, requireRole } from '@/lib/authz';
import { passwordChangedEmail, sendEmail } from '@/lib/email';
import { ChangePasswordSchema, type ChangePasswordInput } from '@/validations/account';

/** Wrong current-password attempts allowed per window before the form locks. */
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type Result = { success: true; message: string } | { success: false; message: string; field?: 'currentPassword' | 'newPassword' };

/**
 * Change the signed-in user's password. Requires the current password.
 *
 * Better Auth's HTTP rate limiter doesn't cover server-side calls, so wrong
 * current-password attempts are counted here (from the audit log, which works
 * across server instances) to stop password guessing from a hijacked session.
 */
export const changeMyPassword = async (input: ChangePasswordInput): Promise<Result> => {
  try {
    const session = await requireRole();
    const parsed = ChangePasswordSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Please check the form.' };
    const { currentPassword, newPassword, revokeOtherSessions } = parsed.data;
    const userId = session.user.id;

    const recentFailures = await prisma.auditLog.count({
      where: { actorId: userId, action: 'PASSWORD_CHANGE_FAILED', createdAt: { gte: new Date(Date.now() - FAILED_ATTEMPT_WINDOW_MS) } },
    });
    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      return { success: false, message: 'Too many incorrect attempts. Please wait 15 minutes, or reset your password from the sign-in page.' };
    }

    const requestHeaders = await headers();
    try {
      // Better Auth's own `revokeOtherSessions` option also replaces *this* session's
      // cookie, and the page re-render after this action would still see the old
      // (now deleted) cookie and treat the user as signed out. So the password is
      // changed first and the other sessions are revoked separately below.
      await auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: false }, headers: requestHeaders });
    } catch (error) {
      const code = error instanceof APIError ? (error.body as { code?: string } | undefined)?.code : undefined;
      if (code === 'INVALID_PASSWORD') {
        await recordAudit({ actorId: userId, action: 'PASSWORD_CHANGE_FAILED', entityType: 'User', entityId: userId, summary: 'Password change refused: current password incorrect' });
        const left = MAX_FAILED_ATTEMPTS - recentFailures - 1;
        return {
          success: false,
          field: 'currentPassword',
          message: left > 0 ? 'Your current password is incorrect.' : 'Your current password is incorrect. The form is now locked for 15 minutes.',
        };
      }
      if (code === 'CREDENTIAL_ACCOUNT_NOT_FOUND') return { success: false, message: 'Your account signs in with Google, so there’s no password to change here.' };
      if (code === 'PASSWORD_TOO_SHORT' || code === 'PASSWORD_TOO_LONG') return { success: false, field: 'newPassword', message: 'Use between 8 and 128 characters.' };
      throw error;
    }

    // Signs out every other device (a possibly stolen session can't survive the change).
    if (revokeOtherSessions) await auth.api.revokeOtherSessions({ headers: requestHeaders });

    await recordAudit({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      summary: revokeOtherSessions ? 'Changed own password; signed out other devices' : 'Changed own password',
    });

    // Security notice by email, sent after the response so a slow mail server doesn't hold up the form.
    const { name, email } = session.user;
    after(async () => {
      try {
        const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date()) + ' UTC';
        const resetUrl = `${process.env.BETTER_AUTH_URL ?? ''}/auth/forgot-password`;
        await sendEmail({ to: email, ...passwordChangedEmail({ name, when, resetUrl }) });
      } catch (error) {
        console.error('[changeMyPassword] notice email failed', error);
      }
    });

    return {
      success: true,
      message: revokeOtherSessions ? 'Password updated. Other devices have been signed out.' : 'Password updated.',
    };
  } catch (error) {
    const failure = authFailure(error);
    if (failure) return { success: false, message: failure.message };
    console.error('[changeMyPassword]', error);
    return { success: false, message: 'Could not update your password. Please try again.' };
  }
};

