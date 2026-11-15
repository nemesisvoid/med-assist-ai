import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/get-user';
import { LOGIN_PATH, resolvePostLoginPath } from '@/routes';

type SearchParams = Promise<{ next?: string; error?: string }>;

/**
 * Landing route after email verification and OAuth sign-in.
 * Better Auth redirects here with a fresh session cookie (or an `error` param);
 * we forward the user to the dashboard for their role.
 */
const AuthCallbackPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { next, error } = await searchParams;

  if (error) redirect(`${LOGIN_PATH}?error=${encodeURIComponent(error)}`);

  const session = await getLoggedInUser();
  if (!session) redirect(`${LOGIN_PATH}?error=session_expired`);

  redirect(resolvePostLoginPath(session.user.role, next));
};

export default AuthCallbackPage;
