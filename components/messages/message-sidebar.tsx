'use client';

import { useState } from 'react';
import { SearchIcon, MessageSquarePlus, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import StartConversationDialog from './start-conversation-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationItem = {
    id: string;
    name: string;
    avatar: string | null;
    initials: string;
    unread?: number;
    lastMessage?: string;
    lastMessageTime?: string;
    specialty?: string;
    appointmentType?: string;
    appointmentStatus?: string;
};

type MessageSidebarProps = {
    data: ConversationItem[];
    totalUnread?: number;
    userId: string;
    userRole: string;
    setSelectedConversationId: (id: string) => void;
    selectedConversationId?: string | null;
    onConversationCreated?: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

const MessageSidebar = ({
    data,
    setSelectedConversationId,
    selectedConversationId,
    totalUnread = 0,
    userId,
    userRole,
    onConversationCreated,
}: MessageSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    const filteredData = data.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleConversationCreated = (conversationId: string) => {
        onConversationCreated?.(conversationId);
        setSelectedConversationId(conversationId);
    };

    return (
        <>
            <aside className='w-full max-w-[300px] shrink-0 flex flex-col border-r border-slate-100'>

                {/* ── Panel Header ─────────────────────────────────────────────── */}
                <div className='px-5 pt-5 pb-4 border-b border-slate-100'>
                    <div className='flex items-center justify-between mb-4'>
                        <div>
                            <h2 className='text-base font-bold text-slate-900'>Messages</h2>
                            {totalUnread > 0 && (
                                <p className='text-xs text-slate-400 mt-0.5'>
                                    <span className='font-semibold text-blue-600'>{totalUnread}</span> unread
                                </p>
                            )}
                        </div>

                        {/* New conversation button */}
                        <button
                            id='start-conversation-btn'
                            onClick={() => setDialogOpen(true)}
                            title='Start a new conversation'
                            aria-label='Start a new conversation'
                            className='p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                        >
                            <MessageSquarePlus size={17} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className='relative'>
                        <SearchIcon
                            size={14}
                            className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                        />
                        <input
                            id='doctor-search'
                            type='text'
                            placeholder='Search doctors...'
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className='w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150'
                        />
                    </div>
                </div>

                {/* ── Conversation List / Empty States ─────────────────────────── */}
                <div className='flex-1 overflow-y-auto'>
                    {data.length === 0 ? (
                        /* No conversations at all */
                        <div className='flex flex-col items-center justify-center h-full py-12 px-5 text-center gap-4'>
                            <div className='p-4 rounded-2xl bg-blue-50 border border-blue-100'>
                                <MessageSquarePlus size={24} className='text-blue-500' />
                            </div>
                            <div className='space-y-1'>
                                <p className='text-sm font-semibold text-slate-700'>No conversations yet</p>
                                <p className='text-xs text-slate-400 leading-relaxed'>
                                    Start a conversation with one of your assigned doctors.
                                </p>
                            </div>
                            <button
                                id='start-conversation-empty-btn'
                                onClick={() => setDialogOpen(true)}
                                className='inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                            >
                                <MessageSquarePlus size={15} />
                                Start a Conversation
                            </button>
                        </div>
                    ) : searchQuery && filteredData.length === 0 ? (
                        /* Search returned nothing */
                        <div className='flex flex-col items-center justify-center py-16 px-4 text-center gap-3'>
                            <SearchIcon size={20} className='text-slate-300' />
                            <p className='text-sm text-slate-400'>No doctors match your search.</p>
                        </div>
                    ) : (
                        /* Conversation list */
                        <div className='divide-y divide-slate-50'>
                            {filteredData.map(user => (
                                <UserListItem
                                    key={user.id}
                                    user={user}
                                    isActive={selectedConversationId === user.id}
                                    onClick={() => setSelectedConversationId(user.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── HIPAA footer ─────────────────────────────────────────────── */}
                <div className='px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-center gap-1.5'>
                    <ShieldCheck size={11} className='text-slate-400' />
                    <p className='text-[11px] text-slate-400 text-center leading-relaxed'>
                        Messages are encrypted &amp; HIPAA-compliant
                    </p>
                </div>
            </aside>

            {/* ── Dialog ───────────────────────────────────────────────────────── */}
            <StartConversationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                userId={userId}
                userRole={userRole}
                onConversationCreated={handleConversationCreated}
            />
        </>
    );
};

export default MessageSidebar;

// ─── User List Item ───────────────────────────────────────────────────────────

const UserListItem = ({
    user,
    isActive,
    onClick,
}: {
    user: ConversationItem;
    isActive: boolean;
    onClick: () => void;
}) => {
    const initials = user.initials?.toUpperCase() || user.name.slice(0, 2).toUpperCase();

    return (
        <button
            id={`doctor-thread-${user.id}`}
            onClick={onClick}
            aria-current={isActive ? 'true' : 'false'}
            className={cn(
                'w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                isActive
                    ? 'bg-blue-50 border-r-2 border-r-blue-600'
                    : 'hover:bg-slate-50 border-r-2 border-r-transparent',
            )}
        >
            {/* Avatar */}
            <div className='relative shrink-0'>
                <div className='size-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border border-slate-200 flex items-center justify-center'>
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className='size-full rounded-full object-cover'
                        />
                    ) : (
                        <span className='text-xs font-bold text-indigo-700'>{initials}</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between gap-2'>
                    <span
                        className={cn(
                            'text-sm truncate',
                            isActive ? 'font-semibold text-blue-700' : 'font-semibold text-slate-800',
                        )}
                    >
                        {user.name}
                    </span>
                    {user.lastMessageTime && (
                        <span className='text-[11px] text-slate-400 shrink-0'>{user.lastMessageTime}</span>
                    )}
                </div>

                {/* Appointment subtitle */}
                {user.appointmentType && (
                    <p className={cn(
                        'text-[11px] truncate leading-snug mt-0.5 flex items-center gap-1',
                        user.appointmentStatus === 'COMPLETED'
                            ? 'text-slate-400'
                            : 'text-blue-600 font-medium',
                    )}>
                        {user.appointmentStatus === 'COMPLETED' && (
                            <Lock size={9} className='shrink-0' />
                        )}
                        {user.appointmentType}
                        {user.appointmentStatus === 'COMPLETED' && ' · Completed'}
                    </p>
                )}

                <div className='flex items-center justify-between gap-2 mt-0.5'>
                    {user.lastMessage ? (
                        <p className='text-xs text-slate-500 truncate leading-snug'>{user.lastMessage}</p>
                    ) : (
                        <p className='text-xs text-slate-400 italic truncate leading-snug'>No messages yet</p>
                    )}
                    {user.appointmentStatus === 'COMPLETED' ? (
                        <Lock size={11} className='text-slate-300 shrink-0' />
                    ) : (user.unread ?? 0) > 0 && (
                        <span className='shrink-0 text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-blue-300/40'>
                            {user.unread}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};