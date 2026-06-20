'use client';

import { useState } from 'react';
import MessageSidebar from '@/components/messages/message-sidebar';
import ChatSection from './chat-section';
import type { SocketMessage } from '@/hooks/use-socket';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ConversationItem = {
  id: string;
  name: string;
  avatar: string | null;
  initials: string;
  /** The partner's user ID — needed by the socket to know who to send to */
  partnerId: string;
  specialty?: string;
  unread?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  messages?: SocketMessage[];
};

interface ChatRoomProps {
  data: ConversationItem[];
  /** Logged-in user's ID — passed all the way down to useSocket */
  userId: string;
  userRole: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const ChatRoom = ({ data, userId, userRole }: ChatRoomProps) => {
  const [conversations, setConversations] = useState<ConversationItem[]>(data);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) ?? null;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);

  /**
   * Optimistic insertion after a new conversation is created via the dialog.
   * The real data arrives on the next server render / page reload.
   */
  const handleConversationCreated = (newConversationId: string, partnerId?: string) => {
    if (conversations.some(c => c.id === newConversationId)) {
      setSelectedConversationId(newConversationId);
      return;
    }

    setConversations(prev => [
      {
        id: newConversationId,
        name: 'New Conversation',
        avatar: null,
        initials: 'NC',
        partnerId: partnerId ?? '',
        unread: 0,
        messages: [],
      },
      ...prev,
    ]);
    setSelectedConversationId(newConversationId);
  };

  return (
    <div className='flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100'>
      <MessageSidebar
        data={conversations}
        userId={userId}
        userRole={userRole}
        totalUnread={totalUnread}
        selectedConversationId={selectedConversationId}
        setSelectedConversationId={setSelectedConversationId}
        onConversationCreated={handleConversationCreated}
      />

      <ChatSection
        selectedConversationId={selectedConversationId}
        selectedConversation={selectedConversation as any}
        userId={userId}
        userRole={userRole}
      />
    </div>
  );
};

export default ChatRoom;