/**
 * Socket.io client singleton.
 *
 * Guarantees only one socket connection per browser session regardless of how
 * many components call `getSocket()`.
 *
 * Authentication: on every (re)connect the client fetches a short-lived signed
 * token from /api/socket-token (which requires a signed-in session) and sends it
 * in the handshake. The socket server identifies the user from that token, so a
 * browser can't claim to be someone else.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

// Module-level singleton — survives React re-renders and component remounts.
let socket: Socket | null = null;
let connectedUserId: string | null = null;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;
let authRetries = 0;
const MAX_AUTH_RETRIES = 5;

async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/socket-token', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    const { token } = (await res.json()) as { token?: string };
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the shared socket instance, creating it if it does not exist or if
 * the userId has changed (e.g. the user logs out and back in as someone else).
 * `userId` only scopes the singleton; the server never trusts it.
 */
export function getSocket(userId: string): Socket {
  // Reconnect if userId changed (account switch)
  if (socket && connectedUserId !== userId) {
    disconnectSocket();
  }

  if (!socket) {
    const instance = io(SOCKET_URL, {
      // Called before every connection attempt, so expired tokens are never reused.
      auth: cb => {
        fetchSocketToken().then(token => cb({ token }));
      },
      // Prefer WebSocket; fall back to polling if needed
      transports: ['websocket', 'polling'],
      // Auto-reconnect with exponential back-off
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socket = instance;
    connectedUserId = userId;

    instance.on('connect', () => {
      authRetries = 0;
      console.log(`[socket-client] Connected (id: ${instance.id})`);
    });

    instance.on('disconnect', reason => {
      console.log(`[socket-client] Disconnected: ${reason}`);
    });

    instance.on('connect_error', err => {
      console.warn('[socket-client] Connection error:', err.message);
      // A rejected handshake (e.g. token fetch failed) stops Socket.io's own
      // reconnection; retry a few times in case it was transient.
      if (!instance.active && authRetries < MAX_AUTH_RETRIES) {
        authRetries += 1;
        authRetryTimer = setTimeout(() => instance.connect(), 3000 * authRetries);
      }
    });
  }

  return socket;
}

/** Explicitly disconnect and clear the singleton (call on logout). */
export function disconnectSocket(): void {
  if (authRetryTimer) clearTimeout(authRetryTimer);
  authRetryTimer = null;
  authRetries = 0;
  if (socket) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
  }
}
