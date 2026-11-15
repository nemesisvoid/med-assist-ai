import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/get-user';
import { getDashboardPath, LOGIN_PATH } from '@/routes';

export class AuthorizationError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Guard for admin server actions and data loaders.
 * The proxy already blocks non-admins from /admin pages, but server actions are
 * independently reachable endpoints, so every one re-checks the role here.
 */
export async function requireAdmin() {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'ADMIN') throw new AuthorizationError();
  return session;
}

/** Page/layout variant: redirects instead of throwing. */
export async function requireAdminPage() {
  const session = await getLoggedInUser();
  if (!session) redirect(LOGIN_PATH);
  if (session.user.role !== 'ADMIN') redirect(getDashboardPath(session.user.role));
  return session;
}
