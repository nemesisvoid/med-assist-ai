/**
 * Standalone Socket.io server — runs on port 3001 alongside Next.js (:3000).
 * Start with: npm run socket
 *
 * Responsibilities:
 *  - Manage WebSocket connections
 *  - Track online/offline user presence
 *  - Handle conversation rooms (join/leave)
 *  - Persist messages to PostgreSQL via Prisma
 *  - Broadcast real-time events to room participants
 */

import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { MESSAGING_ALLOWED_STATUSES } from './lib/messaging-constants';

// ─── Prisma setup (mirrors lib/prisma.ts but for standalone Node process) ──────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── HTTP + Socket.io server ────────────────────────────────────────────────────

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Ping/pong to detect stale connections quickly
  pingTimeout: 20000,
  pingInterval: 25000,
});

// ─── Online presence tracking ────────────────────────────────────────────────────
// userId → Set<socketId>  (multiple tabs = multiple sockets, same user)

const onlineUsers = new Map<string, Set<string>>();

function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId)?.size ?? 0) > 0;
}

function setUserOnline(userId: string, socketId: string): void {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socketId);
}

function setUserOffline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // fully offline now
  }
  return false; // still has other active tabs
}

// ─── Event types ─────────────────────────────────────────────────────────────────

interface JoinRoomPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface GetUserStatusPayload {
  targetUserId: string;
}

// ─── Connection handler ───────────────────────────────────────────────────────────

io.on('connection', async (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (!userId || typeof userId !== 'string') {
    console.warn(`[socket] Connection rejected — no userId`);
    socket.disconnect(true);
    return;
  }

  console.log(`[socket] User connected: ${userId} (socket: ${socket.id})`);

  // ── Mark online ──────────────────────────────────────────────────────────────
  setUserOnline(userId, socket.id);

  // Broadcast to everyone that this user is now online
  io.emit('user_status', { userId, isOnline: true });

  // ── Join a conversation room ─────────────────────────────────────────────────
  socket.on('join_conversation', ({ conversationId }: JoinRoomPayload) => {
    socket.join(conversationId);
    console.log(`[socket] ${userId} joined room: ${conversationId}`);
  });

  // ── Leave a conversation room ────────────────────────────────────────────────
  socket.on('leave_conversation', ({ conversationId }: JoinRoomPayload) => {
    socket.leave(conversationId);
    console.log(`[socket] ${userId} left room: ${conversationId}`);
  });

  // ── Send a message ───────────────────────────────────────────────────────────
  socket.on('send_message', async (payload: SendMessagePayload) => {
    const { conversationId, senderId, receiverId, content } = payload;

    if (!conversationId || !senderId || !receiverId || !content?.trim()) {
      socket.emit('error', { message: 'Invalid message payload' });
      return;
    }

    try {
      // 1. Fetch the conversation to verify the active appointment
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          activeAppointmentId: true,
          activeAppointment: { select: { status: true } },
        },
      });

      const MESSAGING_ALLOWED = MESSAGING_ALLOWED_STATUSES as readonly string[];

      if (!conversation?.activeAppointmentId) {
        socket.emit('error', { message: 'Messaging is unavailable — no active appointment.' });
        return;
      }

      if (!conversation.activeAppointment || !MESSAGING_ALLOWED.includes(conversation.activeAppointment.status)) {
        socket.emit('error', { message: 'Messaging is not permitted for the current appointment status.' });
        return;
      }

      // 2. Persist with the active appointmentId stamped on the message
      const message = await prisma.message.create({
        data: {
          conversationId,
          appointmentId: conversation.activeAppointmentId,
          senderId,
          receiverId,
          content: content.trim(),
          isRead: false,
        },
      });

      // 3. Touch conversation timestamp so sidebar sorting stays correct
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // 4. Broadcast to all sockets in the room (sender included — for multi-tab)
      const outgoing = {
        id: message.id,
        conversationId: message.conversationId,
        appointmentId: message.appointmentId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
        messageStatus: message.messageStatus,
      };

      io.to(conversationId).emit('new_message', outgoing);
    } catch (err) {
      console.error('[socket] Failed to save message:', err);
      socket.emit('error', { message: 'Failed to send message. Please try again.' });
    }
  });


  // ── Typing indicator ─────────────────────────────────────────────────────────
  socket.on('typing', ({ conversationId, userId: typingUserId, isTyping }: TypingPayload) => {
    // Broadcast to everyone else in the room
    socket.to(conversationId).emit('typing', { userId: typingUserId, isTyping });
  });

  // ── Get online status of a specific user ─────────────────────────────────────
  socket.on('get_user_status', ({ targetUserId }: GetUserStatusPayload) => {
    const isOnline = isUserOnline(targetUserId);
    console.log(`[socket] get_user_status requested by ${userId} for ${targetUserId} -> ${isOnline}`);
    socket.emit('user_status', { userId: targetUserId, isOnline });
  });

  // ── Mark messages as read ─────────────────────────────────────────────────────
  socket.on('mark_read', async ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
    try {
      await prisma.message.updateMany({
        where: { conversationId, receiverId: readerId, isRead: false },
        data: { isRead: true },
      });
      // Tell the sender their messages were read
      socket.to(conversationId).emit('messages_read', { conversationId, readerId });
    } catch (err) {
      console.error('[socket] Failed to mark read:', err);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[socket] User disconnected: ${userId} (socket: ${socket.id})`);

    const wentFullyOffline = setUserOffline(userId, socket.id);

    if (wentFullyOffline) {
      // Broadcast offline status (presence is tracked in-memory via onlineUsers)
      io.emit('user_status', { userId, isOnline: false });
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.SOCKET_PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`✅ Socket.io server running on http://localhost:${PORT}`);
  console.log(`   Accepting connections from: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[socket] Shutting down gracefully…');
  await prisma.$disconnect();
  pool.end();
  process.exit(0);
});
