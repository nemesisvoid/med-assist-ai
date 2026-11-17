import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from './auth';

/**
 * The signed-in user's session, read from the session cookie on the server.
 * Memoised per request so layouts, pages and permission checks that all need
 * the session only look it up once.
 */
export const getLoggedInUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});
