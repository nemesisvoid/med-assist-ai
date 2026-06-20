/**
 * Socket.io client singleton.
 *
 * Guarantees only one socket connection per browser session regardless of how
 * many components call `getSocket()`. Passes `userId` in the handshake so the
 * server can immediately track presence without a separate auth round-trip.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

// Module-level singleton — survives React re-renders and component remounts.
let socket: Socket | null = null;
let connectedUserId: string | null = null;

/**
 * Returns the shared socket instance, creating it if it does not exist or if
 * the userId has changed (e.g. the user logs out and back in as someone else).
 */
export function getSocket(userId: string): Socket {
  // Reconnect if userId changed (account switch)
  if (socket && connectedUserId !== userId) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      query: { userId },
      // Prefer WebSocket; fall back to polling if needed
      transports: ['websocket', 'polling'],
      // Auto-reconnect with exponential back-off
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    connectedUserId = userId;

    socket.on('connect', () => {
      console.log(`[socket-client] Connected as ${userId} (id: ${socket?.id})`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[socket-client] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket-client] Connection error:', err.message);
    });
  }

  return socket;
}

/** Explicitly disconnect and clear the singleton (call on logout). */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
  }
}
