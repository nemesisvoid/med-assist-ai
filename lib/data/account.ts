import { prisma } from '@/lib/prisma';

/**
 * Read-side account helpers for server components (not `'use server'` actions,
 * so they can't be called from the browser with an arbitrary user ID).
 */

/** Whether the user can sign in with a password (vs. Google-only sign-in). */
export async function hasPasswordLogin(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential', password: { not: null } },
    select: { id: true },
  });
  return !!account;
}
