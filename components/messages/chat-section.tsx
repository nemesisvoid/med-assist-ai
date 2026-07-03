'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    ImageIcon, InfoIcon, SendIcon, VideoIcon, WifiOff,
    CalendarDays, ExternalLink, Lock, CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { AttachIcon } from './chat-utils';
import { useSocket, type SocketMessage } from '@/hooks/use-socket';
import { format, differenceInDays } from 'date-fns';
import { MESSAGING_ALLOWED_STATUSES } from '@/lib/messaging-constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

type AppointmentInfo = {
    id: string;
    status: string;
    appointmentType: string;
    scheduledAt: string;
};

type ConversationData = {
    id: string;
    name: string;
    avatar: string | null;
    initials: string;
    specialty?: string;
    partnerId?: string;
    /** The appointment currently open for messaging */
    activeAppointment?: AppointmentInfo | null;
    /** ISO date string — chat becomes read-only after this (7 days after COMPLETED) */
    chatLocksAt?: string | null;
    messages?: SocketMessage[];
};

type ChatSectionProps = {
    selectedConversationId: string | null;
    selectedConversation: ConversationData | null;
    userId: string;
    userRole?: string;
};


// ─── Component ─────────────────────────────────────────────────────────────────

const ChatSection = ({ selectedConversationId, selectedConversation, userId, userRole }: ChatSectionProps) => {
    const [input, setInput] = useState('');
    const [localTyping, setLocalTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [visibleGroupIndex, setVisibleGroupIndex] = useState(0);

    const activeAppt = selectedConversation?.activeAppointment;
    const chatLocksAt = selectedConversation?.chatLocksAt ?? null;

    // Grace period: chatLocksAt is set when appointment is completed; allow read-only view within 7 days
    const daysUntilLock = chatLocksAt ? differenceInDays(new Date(chatLocksAt), new Date()) : null;
    const isInGracePeriod = daysUntilLock !== null && daysUntilLock >= 0;

    // Locked when there is no active appointment, or the appointment status doesn't allow messaging
    // (grace period just shows a warning; messaging remains locked even during grace period)
    const isLocked = !activeAppt || !(MESSAGING_ALLOWED_STATUSES as readonly string[]).includes(activeAppt.status);

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

    // ── Group messages by appointmentId for separators ─────────────────────────
    const messageGroups = useMemo(() => {
        type AppointmentMeta = { id: string; status: string; appointmentType: string; scheduledAt: string } | null | undefined;
        type Group = { appointmentId: string | null | undefined; apptMeta: AppointmentMeta; messages: SocketMessage[] };
        const groups: Group[] = [];
        let currentApptId: string | null | undefined = undefined;

        for (const msg of messages) {
            if (msg.appointmentId !== currentApptId) {
                currentApptId = msg.appointmentId;
                groups.push({ appointmentId: currentApptId, apptMeta: msg.appointment, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        }
        return groups;
    }, [messages]);

    // ── Sticky appointment context: track which group is visible ──────────────
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || messageGroups.length <= 1) return;
        const scrollTop = container.scrollTop;
        let bestIdx = 0;
        groupRefs.current.forEach((el, key) => {
            const idx = messageGroups.findIndex(g => (g.appointmentId ?? 'legacy') === key);
            if (idx !== -1 && el.offsetTop <= scrollTop + 64) bestIdx = idx;
        });
        setVisibleGroupIndex(bestIdx);
    }, [messageGroups]);

    const visibleGroup = messageGroups[visibleGroupIndex] ?? null;

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
                                    <span className={cn('text-xs font-medium flex items-center gap-1', partnerOnline ? 'text-emerald-600' : 'text-slate-400')}>
                                        <span className={cn('w-1.5 h-1.5 rounded-full', partnerOnline ? 'bg-emerald-500' : 'bg-slate-300')} />
                                        {partnerOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className='flex items-center gap-1.5 shrink-0'>
                            {!isConnected && (
                                <span className='flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full'>
                                    <WifiOff size={11} />Reconnecting…
                                </span>
                            )}
                            <button id='btn-video-call' aria-label='Start video call' className='w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'>
                                <VideoIcon size={18} />
                            </button>
                            <button id='btn-chat-info' aria-label='View information' className='w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'>
                                <InfoIcon size={18} />
                            </button>
                        </div>
                    </header>

                    {/* ── Emergency banner ─────────────────────────────────────── */}
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

                    {/* ── Active Appointment Banner ─────────────────────────────── */}
                    {activeAppt ? (
                        <div className={cn(
                            'border-b px-6 py-2.5 flex items-center justify-between shrink-0',
                            isLocked
                                ? 'bg-slate-50 border-slate-100'
                                : 'bg-blue-50/60 border-blue-100',
                        )}>
                            <div className='flex items-center gap-2'>
                                {isLocked ? <Lock size={13} className='text-slate-400' /> : <CalendarDays size={13} className='text-blue-600' />}
                                <div className='flex items-center gap-1.5'>
                                    <span className={cn('text-xs font-semibold', isLocked ? 'text-slate-500' : 'text-blue-900')}>
                                        {activeAppt.appointmentType}
                                    </span>
                                    <span className={cn('text-[11px]', isLocked ? 'text-slate-400' : 'text-blue-600/70')}>
                                        · {format(new Date(activeAppt.scheduledAt), 'MMM d, yyyy')}
                                    </span>
                                    {isLocked && (
                                        <span className='ml-1 text-[10px] bg-slate-200/80 text-slate-500 rounded-full px-2 py-0.5 font-medium'>
                                            {activeAppt.status === 'COMPLETED' ? 'Completed' : activeAppt.status.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link
                                href={userRole === 'DOCTOR'
                                    ? `/doctor/appointments/${activeAppt.id}`
                                    : `/patient/appointments/${activeAppt.id}`}
                                className='text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline'
                            >
                                View Appointment <ExternalLink size={10} />
                            </Link>
                        </div>
                    ) : (
                        <div className='border-b border-slate-100 bg-slate-50/60 px-6 py-2 flex items-center gap-2 shrink-0'>
                            <Lock size={12} className='text-slate-400' />
                            <p className='text-[11px] text-slate-400'>No active appointment — chat is read-only.</p>
                        </div>
                    )}

                    {/* ── Messages area ─────────────────────────────────────────── */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className='flex-1 overflow-y-auto px-5 py-4 space-y-1 relative'
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {/* ── Sticky appointment context chip ────────────────────── */}
                        {messageGroups.length > 1 && visibleGroup?.apptMeta && (
                            <div className='sticky top-0 z-20 flex justify-center pb-2 pointer-events-none'>
                                <div className='inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-3 py-1 text-[11px] text-slate-600 font-medium pointer-events-auto'>
                                    <CalendarDays size={10} className='text-blue-500' />
                                    <span className='text-slate-800'>{visibleGroup.apptMeta.appointmentType}</span>
                                    <span className='text-slate-400'>·</span>
                                    <span>{format(new Date(visibleGroup.apptMeta.scheduledAt), 'MMM d, yyyy')}</span>
                                    <span className={cn(
                                        'ml-0.5 px-1.5 py-px rounded-full text-[10px] font-semibold',
                                        visibleGroup.apptMeta.status === 'COMPLETED'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-blue-100 text-blue-700',
                                    )}>
                                        {visibleGroup.apptMeta.status === 'COMPLETED' ? 'Completed' : visibleGroup.apptMeta.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ── Grace-period lock warning ──────────────────────────── */}
                        {isInGracePeriod && (
                            <div className='flex justify-center my-3'>
                                <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 max-w-md w-full text-center shadow-sm'>
                                    <div className='flex items-center justify-center gap-1.5 mb-1.5'>
                                        <Lock size={13} className='text-amber-600' />
                                        <p className='text-xs font-bold text-amber-800'>Chat archiving soon</p>
                                    </div>
                                    <p className='text-[11px] text-amber-700 leading-relaxed'>
                                        This appointment is complete. Chat history will be archived in{' '}
                                        <span className='font-bold'>{daysUntilLock === 0 ? 'less than a day' : `${daysUntilLock} day${daysUntilLock === 1 ? '' : 's'}`}</span>
                                        {chatLocksAt && (
                                            <> (on {format(new Date(chatLocksAt), 'MMMM d, yyyy')}).</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

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
                            messageGroups.map((group, gi) => (
                                <div
                                    key={group.appointmentId ?? `legacy-${gi}`}
                                    ref={el => {
                                        if (el) groupRefs.current.set(group.appointmentId ?? 'legacy', el);
                                        else groupRefs.current.delete(group.appointmentId ?? 'legacy');
                                    }}
                                    className='space-y-3'
                                >
                                    {/* Appointment separator — only shown when there are multiple groups */}
                                    {messageGroups.length > 1 && (
                                        <AppointmentSeparator
                                            appointmentId={group.appointmentId}
                                            isActive={group.appointmentId === activeAppt?.id}
                                            apptMeta={group.apptMeta ?? (group.appointmentId === activeAppt?.id ? activeAppt ?? undefined : undefined)}
                                            userRole={userRole}
                                        />
                                    )}
                                    {group.messages.map(msg => (
                                        msg.messageStatus === 'SYSTEM'
                                            ? <SystemMessageCard key={msg.id} content={msg.content ?? ''} createdAt={msg.createdAt} />
                                            : <MessageBubble key={msg.id} message={msg} currentUserId={userId} />
                                    ))}
                                </div>
                            ))
                        )}

                        {isTyping && <TypingIndicator name={selectedConversation.name.split(' ')[0]} />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Footer: locked or input ─────────────────────────────── */}
                    {isLocked ? (
                        <div className='px-5 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-center gap-2.5'>
                            <Lock size={14} className='text-slate-400 shrink-0' />
                            <p className='text-sm text-slate-500 font-medium'>
                                {activeAppt
                                    ? `Messaging is unavailable while the appointment is ${activeAppt.status.replace(/_/g, ' ').toLowerCase()}.`
                                    : 'No active appointment — this conversation is read-only.'}
                            </p>
                        </div>
                    ) : (
                        <footer className='px-5 py-4 border-t border-slate-100 bg-white shrink-0'>
                            <div className='flex items-end gap-3'>
                                <div className='flex items-center gap-1 pb-1'>
                                    <button id='btn-attach-file' aria-label='Attach a file' className='w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'>
                                        <AttachIcon />
                                    </button>
                                    <button id='btn-attach-image' aria-label='Attach an image' className='w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'>
                                        <ImageIcon size={16} />
                                    </button>
                                </div>

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

                                <button
                                    id='btn-send-message'
                                    aria-label='Send message'
                                    onClick={handleSend}
                                    disabled={!input.trim() || !isConnected}
                                    className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                                        input.trim() && isConnected
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer'
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

// ─── AppointmentSeparator ──────────────────────────────────────────────────────

const APPT_STATUS_LABEL: Record<string, string> = {
    COMPLETED: 'Completed',
    IN_PROGRESS: 'In Progress',
    ASSIGNED: 'Doctor Assigned',
    READY_FOR_REVIEW: 'Under Review',
    NOTES_GENERATED: 'Notes Ready',
    PENDING_INTAKE: 'Pending Intake',
    CANCELLED: 'Cancelled',
};

const AppointmentSeparator = ({
    appointmentId,
    isActive,
    apptMeta,
    userRole,
}: {
    appointmentId?: string | null;
    isActive: boolean;
    apptMeta?: { id: string; status: string; appointmentType: string; scheduledAt: string };
    userRole?: string;
}) => {
    if (!appointmentId) {
        return (
            <div className='flex items-center gap-3 my-4'>
                <div className='flex-1 h-px bg-slate-100' />
                <span className='text-[11px] text-slate-400 shrink-0 px-2'>Earlier messages</span>
                <div className='flex-1 h-px bg-slate-100' />
            </div>
        );
    }

    if (!apptMeta) {
        return (
            <div className='flex items-center gap-3 my-4'>
                <div className='flex-1 h-px bg-slate-100' />
                <span className='text-[11px] text-slate-400 shrink-0 px-2 font-mono'>Previous Appointment</span>
                <div className='flex-1 h-px bg-slate-100' />
            </div>
        );
    }

    const statusLabel = APPT_STATUS_LABEL[apptMeta.status] ?? apptMeta.status;
    const isCompleted = apptMeta.status === 'COMPLETED';

    return (
        <div className='flex flex-col items-center gap-1.5 my-5'>
            <div className='flex items-center gap-3 w-full'>
                <div className='flex-1 h-px bg-slate-100' />
                <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium',
                    isActive
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500',
                )}>
                    <CalendarDays size={10} />
                    <span>{apptMeta.appointmentType}</span>
                    <span className='opacity-60'>·</span>
                    <span>{format(new Date(apptMeta.scheduledAt), 'MMM d, yyyy')}</span>
                </div>
                <div className='flex-1 h-px bg-slate-100' />
            </div>
            <div className='flex items-center gap-2'>
                <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',
                )}>
                    {statusLabel}
                </span>
                {apptMeta.id && (
                    <Link
                        href={userRole === 'DOCTOR'
                            ? `/doctor/appointments/${apptMeta.id}`
                            : `/patient/appointments/${apptMeta.id}`}
                        className='text-[10px] text-blue-500 hover:underline flex items-center gap-0.5'
                    >
                        View <ExternalLink size={8} />
                    </Link>
                )}
            </div>
        </div>
    );
};

// ─── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble = ({ message, currentUserId }: { message: SocketMessage; currentUserId: string }) => {
    const isMine = message.senderId === currentUserId;

    const timeStr = (() => {
        try { return format(new Date(message.createdAt), 'h:mm a'); }
        catch { return ''; }
    })();

    return (
        <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                isMine
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md',
            )}>
                {message.content && <p>{message.content}</p>}
                <p className={cn('text-[10px] mt-1 flex items-center justify-end gap-1', isMine ? 'text-blue-200' : 'text-slate-400')}>
                    {timeStr}
                    {isMine && <CheckCheck size={11} className={message.isRead ? 'text-blue-200' : 'text-blue-300/60'} />}
                </p>
            </div>
        </div>
    );
};

// ─── SystemMessageCard ────────────────────────────────────────────────────────

const SystemMessageCard = ({ content, createdAt }: { content: string; createdAt: string | Date }) => {
    const timeStr = (() => {
        try { return format(new Date(createdAt), 'MMM d, yyyy · h:mm a'); }
        catch { return ''; }
    })();

    return (
        <div className='flex justify-center my-4'>
            <div className='bg-amber-50 border border-amber-200/70 rounded-2xl px-5 py-3.5 max-w-lg w-full shadow-sm'>
                <div className='flex items-start gap-3'>
                    <div className='mt-0.5 p-1.5 bg-amber-100 rounded-lg shrink-0'>
                        <svg className='w-3.5 h-3.5 text-amber-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                        </svg>
                    </div>
                    <div className='flex-1 min-w-0'>
                        <p className='text-[11px] font-bold text-amber-800 mb-1'>System Notice</p>
                        <p className='text-[12px] text-amber-700 leading-relaxed'>{content}</p>
                        {timeStr && <p className='text-[10px] text-amber-500 mt-1.5'>{timeStr}</p>}
                    </div>
                </div>
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
                Select a conversation or start a new one to begin messaging.
            </p>
        </div>
    </div>
);