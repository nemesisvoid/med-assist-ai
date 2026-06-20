'use client';

/**
 * useSocket hook — real-time messaging for a single conversation.
 *
 * Usage:
 *   const { messages, sendMessage, sendTyping, isTyping, partnerOnline, isConnected }
 *     = useSocket({ userId, conversationId, receiverId, initialMessages });
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket-client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SocketMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  createdAt: string | Date;
  isRead: boolean;
  messageStatus?: string;
};

type UseSocketOptions = {
  /** The currently logged-in user's ID */
  userId: string;
  /** The active conversation ID — null when no conversation selected */
  conversationId: string | null;
  /** The other participant's user ID (used for presence checks) */
  receiverId?: string | null;
  /** Messages fetched server-side to pre-populate the chat */
  initialMessages?: SocketMessage[];
};

type UseSocketReturn = {
  messages: SocketMessage[];
  isConnected: boolean;
  /** The other participant is typing */
  isTyping: boolean;
  /** The other participant is currently online */
  partnerOnline: boolean;
  sendMessage: (content: string) => void;
  sendTyping: (isCurrentlyTyping: boolean) => void;
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSocket({
  userId,
  conversationId,
  receiverId,
  initialMessages = [],
}: UseSocketOptions): UseSocketReturn {
  const [messages, setMessages] = useState<SocketMessage[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // Ref so event handlers always see the current conversationId without stale closure
  const conversationRef = useRef<string | null>(conversationId);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core socket event listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket(userId);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    /** Append new message — deduplicates by id for safety */
    const onNewMessage = (msg: SocketMessage) => {
      setMessages(prev =>
        prev.some(m => m.id === msg.id) ? prev : [...prev, msg],
      );
    };

    /** Remote party is typing */
    const onTyping = ({ userId: typingUserId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (typingUserId === userId) return; // ignore our own echo
      setIsTyping(typing);

      if (typing) {
        // Auto-clear after 3 s in case the client crashes without sending stop
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setIsTyping(false), 3000);
      } else {
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
      }
    };

    /** Online/offline status of any user — we only care about our partner */
    const onUserStatus = ({ userId: statusUserId, isOnline }: { userId: string; isOnline: boolean }) => {
      if (statusUserId === receiverId) {
        setPartnerOnline(isOnline);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('user_status', onUserStatus);

    // Sync immediate connection state
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('user_status', onUserStatus);
    };
  }, [userId, receiverId]);

  // ── Join / leave rooms ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket(userId);

    // Leave the previous room before joining the new one
    if (conversationRef.current && conversationRef.current !== conversationId) {
      socket.emit('leave_conversation', { conversationId: conversationRef.current });
    }

    conversationRef.current = conversationId;

    if (conversationId) {
      socket.emit('join_conversation', { conversationId });

      // Ask for the partner's current online status
      if (receiverId) {
        socket.emit('get_user_status', { targetUserId: receiverId });
      }

      // Mark unread messages as read
      socket.emit('mark_read', { conversationId, readerId: userId });
    }

    return () => {
      if (conversationId) {
        socket.emit('leave_conversation', { conversationId });
      }
    };
  }, [userId, conversationId, receiverId]);

  // ── Sync initial messages when conversation changes ──────────────────────────
  useEffect(() => {
    setMessages(initialMessages);
    setIsTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (content: string) => {
      if (!conversationId || !receiverId || !content.trim()) return;
      const socket = getSocket(userId);
      socket.emit('send_message', {
        conversationId,
        senderId: userId,
        receiverId,
        content: content.trim(),
      });
    },
    [userId, conversationId, receiverId],
  );

  const sendTyping = useCallback(
    (isCurrentlyTyping: boolean) => {
      if (!conversationId) return;
      const socket = getSocket(userId);
      socket.emit('typing', { conversationId, userId, isTyping: isCurrentlyTyping });
    },
    [userId, conversationId],
  );

  return {
    messages,
    isConnected,
    isTyping,
    partnerOnline,
    sendMessage,
    sendTyping,
  };
}
