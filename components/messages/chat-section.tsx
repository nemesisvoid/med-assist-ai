'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ImageIcon, InfoIcon, SendIcon, VideoIcon, WifiOff, CalendarDays, ExternalLink, Lock } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { AttachIcon } from './chat-utils';
import { useSocket, type SocketMessage } from '@/hooks/use-socket';
import { format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ConversationData = {
    id: string;
    name: string;
    avatar: string | null;
    initials: string;
    specialty?: string;
    partnerId?: string;
    appointment?: {
        id: string;
        status: string;
        appointmentType: string;
        scheduledAt: string;
    };
    messages?: SocketMessage[];
};

type ChatSectionProps = {
    /** The active conversation ID (null = nothing selected) */
    selectedConversationId: string | null;
    /** Full conversation object from the sidebar */
    selectedConversation: ConversationData | null;
    /** The currently logged-in patient/doctor ID */
    userId: string;
    /** Role of the logged-in user to determine navigation links */
    userRole?: string;
};

// ─── Component ─────────────────────────────────────────────────────────────────

const ChatSection = ({ selectedConversationId, selectedConversation, userId, userRole }: ChatSectionProps) => {
    const [input, setInput] = useState('');
    const [localTyping, setLocalTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isLocked = selectedConversation?.appointment?.status === 'COMPLETED';

    const receiverId = selectedConversation?.partnerId ?? null;

    const { messages, isConnected, isTyping, partnerOnline, sendMessage, sendTyping } = useSocket({
        userId,
        conversationId: selectedConversationId,
        receiverId,
        initialMessages: selectedConversation?.messages ?? [],
    });

    // ── Auto-scroll to latest message ──────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // ── Reset input when conversation switches ──────────────────────────────────
    useEffect(() => {
        setInput('');
        setLocalTyping(false);
    }, [selectedConversationId]);

    // ── Handle typing indicator ─────────────────────────────────────────────────
    const handleInputChange = (value: string) => {
        setInput(value);

        if (!localTyping) {
            setLocalTyping(true);
            sendTyping(true);
        }

        // Debounce: stop typing after 2 s of inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setLocalTyping(false);
            sendTyping(false);
        }, 2000);
    };

    // ── Send handler ────────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
        setLocalTyping(false);
        sendTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        textareaRef.current?.focus();
    }, [input, sendMessage, sendTyping]);

    return (
        <section className='flex-1 flex flex-col min-w-0 overflow-hidden'>
            {selectedConversationId && selectedConversation ? (
                <>
                    {/* ── Header ──────────────────────────────────────────────── */}
                    <header className='px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white shrink-0'>
                        <div className='flex items-center gap-3 min-w-0'>
                            <Avatar>
                                <AvatarImage src={selectedConversation.avatar ?? ''} alt={selectedConversation.name} />
                                <AvatarFallback className='bg-gradient-to-br from-blue-50 to-indigo-100 text-indigo-700 font-bold text-xs'>
                                    {selectedConversation.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className='min-w-0'>
                                <h3 className='text-sm font-bold text-slate-900 truncate'>{selectedConversation.name}</h3>
                                <div className='flex items-center gap-2 mt-0.5'>
                                    {selectedConversation.specialty && (
                                        <>
                                            <span className='text-xs text-slate-500'>{selectedConversation.specialty}</span>
                                            <span className='w-1 h-1 rounded-full bg-slate-300 shrink-0' />
                                        </>
                                    )}
                                    {/* Live presence dot */}
                                    <span
                                        className={cn(
                                            'text-xs font-medium flex items-center gap-1',
                                            partnerOnline ? 'text-emerald-600' : 'text-slate-400',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'w-1.5 h-1.5 rounded-full',
                                                partnerOnline ? 'bg-emerald-500' : 'bg-slate-300',
                                            )}
                                        />
                                        {partnerOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className='flex items-center gap-1.5 shrink-0'>
                            {/* Connection status pill */}
                            {!isConnected && (
                                <span className='flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full'>
                                    <WifiOff size={11} />
                                    Reconnecting…
                                </span>
                            )}
                            <button
                                id='btn-video-call'
                                aria-label='Start video call'
                                className='w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                            >
                                <VideoIcon size={18} />
                            </button>
                            <button
                                id='btn-chat-info'
                                aria-label='View doctor information'
                                className='w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                            >
                                <InfoIcon size={18} />
                            </button>
                        </div>
                    </header>

                    {/* ── Emergency banner ────────────────────────────────────── */}
                    <div className='px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0'>
                        <svg className='w-3.5 h-3.5 text-amber-600 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
                            <line x1='12' y1='9' x2='12' y2='13' />
                            <line x1='12' y1='17' x2='12.01' y2='17' />
                        </svg>
                        <p className='text-[11px] text-amber-700 font-medium'>
                            For medical emergencies, please call 911 or visit your nearest emergency room immediately.
                        </p>
                    </div>

                    {/* ── Appointment Context Banner ──────────────────────────── */}
                    {selectedConversation?.appointment && (
                        <div className='bg-blue-50/50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between shrink-0'>
                            <div className='flex items-center gap-2'>
                                <CalendarDays size={14} className='text-blue-600' />
                                <span className='text-xs text-blue-900 font-medium'>
                                    {selectedConversation.appointment.appointmentType} 
                                </span>
                                <span className='text-[11px] text-blue-700/70'>
                                    ({format(new Date(selectedConversation.appointment.scheduledAt), 'MMM d, yyyy')})
                                </span>
                            </div>
                            <Link 
                                href={userRole === 'DOCTOR' 
                                    ? `/doctor/appointments/${selectedConversation.appointment.id}` 
                                    : `/patient/appointments/${selectedConversation.appointment.id}`
                                } 
                                className='text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline'
                            >
                                View Appointment
                                <ExternalLink size={10} />
                            </Link>
                        </div>
                    )}

                    {/* ── Messages area ────────────────────────────────────────── */}
                    <div className='flex-1 overflow-y-auto px-5 py-4 space-y-3' style={{ scrollbarWidth: 'thin' }}>
                        {messages.length === 0 ? (
                            <div className='flex flex-col items-center justify-center h-full gap-3 text-center py-8'>
                                <div className='w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center'>
                                    <svg className='w-7 h-7 text-slate-300' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1} strokeLinecap='round' strokeLinejoin='round'>
                                        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                                    </svg>
                                </div>
                                <p className='text-sm text-slate-400'>No messages yet. Say hello! 👋</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <MessageBubble key={msg.id} message={msg} currentUserId={userId} />
                            ))
                        )}

                        {/* Typing indicator */}
                        {isTyping && <TypingIndicator name={selectedConversation.name.split(' ')[0]} />}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Message input / Locked state ──────────────────────── */}
                    {isLocked ? (
                        <div className='px-5 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-center gap-2.5'>
                            <Lock size={14} className='text-slate-400 shrink-0' />
                            <p className='text-sm text-slate-500 font-medium'>
                                This conversation is locked — the appointment has been completed.
                            </p>
                        </div>
                    ) : (
                    <footer className='px-5 py-4 border-t border-slate-100 bg-white shrink-0'>
                        <div className='flex items-end gap-3'>
                            {/* Attachment buttons */}
                            <div className='flex items-center gap-1 pb-1'>
                                <button
                                    id='btn-attach-file'
                                    aria-label='Attach a file'
                                    className='w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                                >
                                    <AttachIcon />
                                </button>
                                <button
                                    id='btn-attach-image'
                                    aria-label='Attach an image'
                                    className='w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                                >
                                    <ImageIcon size={16} />
                                </button>
                            </div>

                            {/* Text area */}
                            <div className='flex-1 relative'>
                                <textarea
                                    ref={textareaRef}
                                    id='message-input'
                                    rows={1}
                                    placeholder={`Message ${selectedConversation.name.split(' ')[0]}…`}
                                    value={input}
                                    onChange={e => handleInputChange(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    aria-label='Type your message'
                                    className='w-full resize-none px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150 leading-relaxed max-h-32'
                                    style={{ scrollbarWidth: 'thin' }}
                                />
                            </div>

                            {/* Send button */}
                            <button
                                id='btn-send-message'
                                aria-label='Send message'
                                onClick={handleSend}
                                disabled={!input.trim() || !isConnected}
                                className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                                    input.trim() && isConnected
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                                )}
                            >
                                <SendIcon size={16} />
                            </button>
                        </div>

                        <p className='text-[11px] text-slate-400 mt-2.5 text-center'>
                            Press <kbd className='px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono'>Enter</kbd> to send ·{' '}
                            <kbd className='px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono'>Shift+Enter</kbd> for new line
                        </p>
                    </footer>
                    )}
                </>
            ) : (
                <EmptyChatState />
            )}
        </section>
    );
};

export default ChatSection;

// ─── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble = ({ message, currentUserId }: { message: SocketMessage; currentUserId: string }) => {
    const isMine = message.senderId === currentUserId;

    const timeStr = (() => {
        try {
            return format(new Date(message.createdAt), 'h:mm a');
        } catch {
            return '';
        }
    })();

    return (
        <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                    isMine
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md',
                )}
            >
                {message.content && <p>{message.content}</p>}
                <p
                    className={cn(
                        'text-[10px] mt-1 text-right',
                        isMine ? 'text-blue-200' : 'text-slate-400',
                    )}
                >
                    {timeStr}
                    {isMine && (
                        <span className='ml-1'>
                            {message.isRead ? '✓✓' : '✓'}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

// ─── TypingIndicator ──────────────────────────────────────────────────────────

const TypingIndicator = ({ name }: { name: string }) => (
    <div className='flex items-end gap-2'>
        <div className='bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5'>
            <span className='text-[11px] text-slate-400 mr-1'>{name} is typing</span>
            <span className='w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]' />
            <span className='w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]' />
            <span className='w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]' />
        </div>
    </div>
);

// ─── EmptyChatState ───────────────────────────────────────────────────────────

const EmptyChatState = () => (
    <div className='flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center'>
        <div className='w-24 h-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center'>
            <svg className='w-16 h-16 text-slate-300' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1} strokeLinecap='round' strokeLinejoin='round'>
                <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
            </svg>
        </div>
        <div>
            <h3 className='text-base font-semibold text-slate-700'>Your messages</h3>
            <p className='text-sm text-slate-400 mt-1 max-w-[260px] leading-relaxed'>
                Select a conversation with one of your doctors to get started.
            </p>
        </div>
    </div>
);