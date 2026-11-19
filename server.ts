/**
 * Standalone Socket.io server for realtime messaging (deployed separately, e.g. Render).
 * Start with: npm run socket
 *
 * Security model:
 *  - Every connection must present a short-lived token issued by the Next.js app
 *    (GET /api/socket-token) and signed with SOCKET_AUTH_SECRET. The user's
 *    identity comes only from that token; ids sent by the browser are ignored.
 *  - A user can only join, read, type in or send to conversations they are a
 *    participant of. The sender and receiver of a message are derived on the
 *    server from the conversation.
 *  - Online/offline presence is only shared with people the user has a
 *    conversation with.
 *
 * Responsibilities:
 *  - Manage WebSocket connections and presence
 *  - Handle conversation rooms (join/leave)
 *  - Persist messages to PostgreSQL via Prisma and broadcast them to the room
 */

import 'dotenv/config';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { MESSAGING_ALLOWED_STATUSES } from './lib/messaging-constants';
import { verifySocketToken } from './lib/socket-token';

const SOCKET_AUTH_SECRET = process.env.SOCKET_AUTH_SECRET ?? '';
if (!SOCKET_AUTH_SECRET) {
  console.error('❌ SOCKET_AUTH_SECRET is not set. It must match the value configured on the Next.js app. Refusing to start.');
  process.exit(1);
}

const MAX_MESSAGE_LENGTH = 5000;

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
  maxHttpBufferSize: 100_000,
});

type AuthedSocket = Socket & { data: { userId: string; role: string } };

// ─── Authentication ───────────────────────────────────────────────────────────

io.use(async (socket, next) => {
  const claims = verifySocketToken(socket.handshake.auth?.token, SOCKET_AUTH_SECRET);
  if (!claims) return next(new Error('unauthorized'));

  // Suspended users lose their sessions, but also refuse a token minted just before suspension.
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { banned: true } }).catch(() => null);
  if (!user || user.banned) return next(new Error('unauthorized'));

  socket.data.userId = claims.sub;
  socket.data.role = claims.role;
  next();
});

// ─── Access helpers ───────────────────────────────────────────────────────────

const userRoom = (userId: string) => `user:${userId}`;
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 200;

/** The conversation, only if this user is one of its two participants. */
function findConversationForUser(conversationId: unknown, userId: string) {
  if (!isString(conversationId)) return Promise.resolve(null);
  return prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ patientId: userId }, { doctorId: userId }] },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      activeAppointmentId: true,
      chatLocksAt: true,
      activeAppointment: { select: { status: true } },
    },
  });
}

/** Ids of everyone this user has a conversation with (the only people who see their presence). */
async function getPartnerIds(userId: string): Promise<string[]> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ patientId: userId }, { doctorId: userId }] },
    select: { patientId: true, doctorId: true },
  });
  return [...new Set(conversations.map(c => (c.patientId === userId ? c.doctorId : c.patientId)))];
}

// ─── Online presence tracking ────────────────────────────────────────────────────
// userId → Set<socketId>  (multiple tabs = multiple sockets, same user)

const onlineUsers = new Map<string, Set<string>>();

const isUserOnline = (userId: string) => (onlineUsers.get(userId)?.size ?? 0) > 0;

/** Returns true when this is the user's first open connection. */
function setUserOnline(userId: string, socketId: string): boolean {
  const wasOnline = isUserOnline(userId);
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socketId);
  return !wasOnline;
}

/** Returns true when the user's last connection closed. */
function setUserOffline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
}

async function broadcastPresence(userId: string, isOnline: boolean) {
  const partners = await getPartnerIds(userId).catch(() => [] as string[]);
  for (const partnerId of partners) io.to(userRoom(partnerId)).emit('user_status', { userId, isOnline });
}

// ─── Connection handler ───────────────────────────────────────────────────────────

io.on('connection', rawSocket => {
  const socket = rawSocket as AuthedSocket;
  const { userId } = socket.data;

  console.log(`[socket] User connected: ${userId} (socket: ${socket.id})`);

  socket.join(userRoom(userId));
  if (setUserOnline(userId, socket.id)) void broadcastPresence(userId, true);

  // ── Join a conversation room (participants only) ─────────────────────────────
  socket.on('join_conversation', async ({ conversationId }: { conversationId?: unknown } = {}) => {
    const conversation = await findConversationForUser(conversationId, userId).catch(() => null);
    if (!conversation) {
      socket.emit('error', { message: 'Conversation not found.' });
      return;
    }
    socket.join(conversation.id);
  });

  // ── Leave a conversation room ────────────────────────────────────────────────
  socket.on('leave_conversation', ({ conversationId }: { conversationId?: unknown } = {}) => {
    if (isString(conversationId)) socket.leave(conversationId);
  });

  // ── Send a message ───────────────────────────────────────────────────────────
  // Any senderId/receiverId in the payload is ignored: the sender is the
  // authenticated user and the receiver is the other participant. An optional
  // attachmentId must be a confirmed, unsent upload by this user in this conversation.
  socket.on('send_message', async (payload: { conversationId?: unknown; content?: unknown; attachmentId?: unknown } = {}) => {
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const attachmentId = isString(payload.attachmentId) ? payload.attachmentId : null;
    if ((!content && !attachmentId) || content.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: 'Invalid message.' });
      return;
    }

    try {
      const conversation = await findConversationForUser(payload.conversationId, userId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found.' });
        return;
      }

      if (!conversation.activeAppointmentId) {
        socket.emit('error', { message: 'Messaging is unavailable — no active appointment.' });
        return;
      }

      // Lock if grace period has expired
      if (conversation.chatLocksAt && new Date() > new Date(conversation.chatLocksAt)) {
        socket.emit('error', { message: 'This conversation has been locked.' });
        return;
      }

      const allowed = MESSAGING_ALLOWED_STATUSES as readonly string[];
      const apptStatus = conversation.activeAppointment?.status;
      if (!apptStatus || (apptStatus !== 'COMPLETED' && !allowed.includes(apptStatus))) {
        socket.emit('error', { message: 'Messaging is not permitted for the current appointment status.' });
        return;
      }

      const receiverId = conversation.patientId === userId ? conversation.doctorId : conversation.patientId;

      const attachment = attachmentId
        ? await prisma.messageAttachment.findFirst({
            where: { id: attachmentId, conversationId: conversation.id, uploaderId: userId, messageId: null, uploadedAt: { not: null } },
            select: { id: true, fileName: true, mimeType: true, size: true },
          })
        : null;
      if (attachmentId && !attachment) {
        socket.emit('error', { message: 'Attachment not found. Please upload it again.' });
        return;
      }

      // Persist with the active appointmentId stamped on the message, and link the attachment.
      const message = await prisma.$transaction(async tx => {
        const created = await tx.message.create({
          data: {
            conversationId: conversation.id,
            appointmentId: conversation.activeAppointmentId,
            senderId: userId,
            receiverId,
            content: content || null,
            isRead: false,
          },
        });
        if (attachment) {
          // messageId: null in the filter makes the link one-time even under concurrent sends.
          const linked = await tx.messageAttachment.updateMany({
            where: { id: attachment.id, messageId: null },
            data: { messageId: created.id },
          });
          if (linked.count !== 1) throw new Error('attachment already used');
        }
        return created;
      });

      // Touch conversation timestamp so sidebar sorting stays correct
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      // Broadcast to all sockets in the room (sender included — for multi-tab)
      io.to(conversation.id).emit('new_message', {
        id: message.id,
        conversationId: message.conversationId,
        appointmentId: message.appointmentId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
        messageStatus: message.messageStatus,
        attachments: attachment ? [attachment] : [],
      });
    } catch (err) {
      console.error('[socket] Failed to save message:', err);
      socket.emit('error', { message: 'Failed to send message. Please try again.' });
    }
  });

  // ── A message was deleted by its sender (through the app's deleteMessage action) ──
  // Only relayed if the database confirms this user sent it and it really is deleted,
  // so a client can't make someone else's message disappear on screen.
  socket.on('message_deleted', async ({ messageId }: { messageId?: unknown } = {}) => {
    if (!isString(messageId)) return;
    const message = await prisma.message
      .findFirst({ where: { id: messageId, senderId: userId, deletedAt: { not: null } }, select: { id: true, conversationId: true } })
      .catch(() => null);
    if (!message) return;
    io.to(message.conversationId).emit('message_deleted', { messageId: message.id, conversationId: message.conversationId });
  });

  // ── Typing indicator (only in rooms this socket has joined) ──────────────────
  socket.on('typing', ({ conversationId, isTyping }: { conversationId?: unknown; isTyping?: unknown } = {}) => {
    if (!isString(conversationId) || !socket.rooms.has(conversationId)) return;
    socket.to(conversationId).emit('typing', { userId, isTyping: isTyping === true });
  });

  // ── Online status of a conversation partner ──────────────────────────────────
  socket.on('get_user_status', async ({ targetUserId }: { targetUserId?: unknown } = {}) => {
    if (!isString(targetUserId)) return;
    const sharesConversation = await prisma.conversation
      .findFirst({
        where: {
          OR: [
            { patientId: userId, doctorId: targetUserId },
            { patientId: targetUserId, doctorId: userId },
          ],
        },
        select: { id: true },
      })
      .catch(() => null);
    if (!sharesConversation) return;
    socket.emit('user_status', { userId: targetUserId, isOnline: isUserOnline(targetUserId) });
  });

  // ── Mark messages addressed to this user as read ─────────────────────────────
  socket.on('mark_read', async ({ conversationId }: { conversationId?: unknown } = {}) => {
    try {
      const conversation = await findConversationForUser(conversationId, userId);
      if (!conversation) return;
      await prisma.message.updateMany({
        where: { conversationId: conversation.id, receiverId: userId, isRead: false },
        data: { isRead: true },
      });
      // Tell the sender their messages were read
      socket.to(conversation.id).emit('messages_read', { conversationId: conversation.id, readerId: userId });
    } catch (err) {
      console.error('[socket] Failed to mark read:', err);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[socket] User disconnected: ${userId} (socket: ${socket.id})`);
    if (setUserOffline(userId, socket.id)) void broadcastPresence(userId, false);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────────

// Hosts such as Render and Railway assign the port through PORT; SOCKET_PORT is for local dev.
const PORT = parseInt(process.env.PORT ?? process.env.SOCKET_PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`✅ Socket.io server running on port ${PORT}`);
  console.log(`   Accepting connections from: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[socket] Shutting down gracefully…');
  await prisma.$disconnect();
  pool.end();
  process.exit(0);
});
