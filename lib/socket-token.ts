/**
 * Short-lived tokens that let the standalone Socket.io server (server.ts, on
 * Render) trust who a browser is.
 *
 * The Next.js app issues a token only to a signed-in user (GET /api/socket-token).
 * The socket server verifies the signature with the same SOCKET_AUTH_SECRET and
 * takes the user's identity from the token, never from what the browser sends.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
 * Plain Node crypto, with no Next.js imports, so server.ts can import it too.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SOCKET_TOKEN_TTL_SECONDS = 5 * 60;

export type SocketTokenClaims = {
  /** User id */
  sub: string;
  role: string;
  /** Expiry, seconds since epoch */
  exp: number;
};

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function createSocketToken(user: { id: string; role: string }, secret: string, ttlSeconds = SOCKET_TOKEN_TTL_SECONDS): string {
  const claims: SocketTokenClaims = { sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the claims if the token is authentic and unexpired, otherwise null. */
export function verifySocketToken(token: unknown, secret: string): SocketTokenClaims | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SocketTokenClaims>;
    if (typeof claims.sub !== 'string' || typeof claims.role !== 'string' || typeof claims.exp !== 'number') return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: claims.sub, role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}
