'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

type MessageStatus = 'sent' | 'delivered' | 'read';
type MessageSender = 'patient' | 'doctor';

interface ChatMessage {
    id: string;
    text: string;
    sender: MessageSender;
    timestamp: string;
    status?: MessageStatus;
}

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    avatar: string;
    initials: string;
    isOnline: boolean;
    lastMessage: string;
    lastMessageTime: string;
    unread: number;
    messages: ChatMessage[];
}

const MOCK_DOCTORS: Doctor[] = [
    {
        id: 'dr-1',
        name: 'Dr. Sarah Okonkwo',
        specialty: 'Cardiologist',
        avatar: '',
        initials: 'SO',
        isOnline: true,
        lastMessage: 'Your latest ECG results look great! Keep up the good work.',
        lastMessageTime: '10:42 AM',
        unread: 2,
        messages: [
            {
                id: 'm1',
                text: 'Good morning! I have reviewed your recent test results. Everything looks stable.',
                sender: 'doctor',
                timestamp: 'Yesterday, 9:00 AM',
            },
            {
                id: 'm2',
                text: "That's great to hear, Doctor. I've been taking my medication as prescribed.",
                sender: 'patient',
                timestamp: 'Yesterday, 9:15 AM',
                status: 'read',
            },
            {
                id: 'm3',
                text: "Excellent. Make sure to monitor your blood pressure daily and log the readings. I'd like to check in on those next week.",
                sender: 'doctor',
                timestamp: 'Yesterday, 9:18 AM',
            },
            {
                id: 'm4',
                text: 'Absolutely. Should I continue the current dosage for Lisinopril?',
                sender: 'patient',
                timestamp: '10:30 AM',
                status: 'read',
            },
            {
                id: 'm5',
                text: 'Yes, continue the same dosage. However, if you experience any dizziness or shortness of breath, please contact the clinic immediately.',
                sender: 'doctor',
                timestamp: '10:38 AM',
            },
            {
                id: 'm6',
                text: 'Your latest ECG results look great! Keep up the good work.',
                sender: 'doctor',
                timestamp: '10:42 AM',
            },
        ],
    },
    {
        id: 'dr-2',
        name: 'Dr. Marcus Webb',
        specialty: 'General Practitioner',
        avatar: '',
        initials: 'MW',
        isOnline: false,
        lastMessage: 'I\'ve sent your referral to the specialist. You should receive a call within 2 business days.',
        lastMessageTime: 'Yesterday',
        unread: 0,
        messages: [
            {
                id: 'm1',
                text: 'Hello! Following up on your visit. How are you feeling today?',
                sender: 'doctor',
                timestamp: 'Mon, 9:00 AM',
            },
            {
                id: 'm2',
                text: 'Much better, thank you. The cough has reduced significantly.',
                sender: 'patient',
                timestamp: 'Mon, 10:00 AM',
                status: 'read',
            },
            {
                id: 'm3',
                text: 'Glad to hear it. Continue the antibiotic course for 3 more days. Rest well.',
                sender: 'doctor',
                timestamp: 'Mon, 10:05 AM',
            },
            {
                id: 'm4',
                text: 'I\'ve sent your referral to the specialist. You should receive a call within 2 business days.',
                sender: 'doctor',
                timestamp: 'Yesterday',
            },
        ],
    },
    {
        id: 'dr-3',
        name: 'Dr. Amara Diallo',
        specialty: 'Neurologist',
        avatar: '',
        initials: 'AD',
        isOnline: true,
        lastMessage: 'Please complete the symptom diary before our next appointment.',
        lastMessageTime: 'Mon',
        unread: 1,
        messages: [
            {
                id: 'm1',
                text: 'Hi there! I wanted to follow up on the migraine episodes you reported. How frequent are they now?',
                sender: 'doctor',
                timestamp: 'Mon, 8:00 AM',
            },
            {
                id: 'm2',
                text: 'About twice a week. They seem to happen when I\'m stressed or don\'t sleep well.',
                sender: 'patient',
                timestamp: 'Mon, 8:30 AM',
                status: 'read',
            },
            {
                id: 'm3',
                text: "That's helpful context. Stress and sleep are strong triggers. I'll adjust your treatment plan.",
                sender: 'doctor',
                timestamp: 'Mon, 8:45 AM',
            },
            {
                id: 'm4',
                text: 'Please complete the symptom diary before our next appointment.',
                sender: 'doctor',
                timestamp: 'Mon, 2:00 PM',
            },
        ],
    },
    {
        id: 'dr-4',
        name: 'Dr. Priya Iyer',
        specialty: 'Dermatologist',
        avatar: '',
        initials: 'PI',
        isOnline: false,
        lastMessage: 'The prescription is ready for collection at the pharmacy.',
        lastMessageTime: 'Last week',
        unread: 0,
        messages: [
            {
                id: 'm1',
                text: "I've reviewed the photos of the skin irritation you sent.It looks like contact dermatitis.",
                sender: 'doctor',
                timestamp: 'Last week',
            },
            {
                id: 'm2',
                text: 'What should I avoid to prevent it from recurring?',
                sender: 'patient',
                timestamp: 'Last week',
                status: 'read',
            },
            {
                id: 'm3',
                text: 'Avoid synthetic fabrics and the skincare product you mentioned. Use hypoallergenic alternatives.',
                sender: 'doctor',
                timestamp: 'Last week',
            },
            {
                id: 'm4',
                text: 'The prescription is ready for collection at the pharmacy.',
                sender: 'doctor',
                timestamp: 'Last week',
            },
        ],
    },
];

// ─── Icon Components ───────────────────────────────────────────────────────────

const SearchIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

const AttachIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

const PhoneIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l1.06-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const VideoIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
);

const InfoIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const CheckDoubleIcon = () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
        <polyline points="24 6 13 17" />
    </svg>
);

const EmptyMessagesIcon = () => (
    <svg className="w-16 h-16 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

// ─── Avatar Component ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
];

const DoctorAvatar = ({ doctor, size = 'md' }: { doctor: Doctor; size?: 'sm' | 'md' | 'lg' }) => {
    const colorIdx = MOCK_DOCTORS.findIndex(d => d.id === doctor.id) % AVATAR_COLORS.length;
    const color = AVATAR_COLORS[colorIdx];
    const sizeClasses = { sm: 'w-9 h-9 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };

    return (
        <div className="relative shrink-0">
            <div className={cn('rounded-full flex items-center justify-center font-bold', sizeClasses[size], color.bg, color.text)}>
                {doctor.initials}
            </div>
            {doctor.isOnline && (
                <span className={cn(
                    'absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500',
                    size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'
                )} />
            )}
        </div>
    );
};

// ─── Doctor List Item ──────────────────────────────────────────────────────────

const DoctorListItem = ({
    doctor,
    isActive,
    onClick,
}: {
    doctor: Doctor;
    isActive: boolean;
    onClick: () => void;
}) => (
    <button
        id={`doctor-thread-${doctor.id}`}
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
        <DoctorAvatar doctor={doctor} size="md" />
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <span className={cn('text-sm truncate', isActive ? 'font-semibold text-blue-700' : 'font-semibold text-slate-800')}>
                    {doctor.name}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0">{doctor.lastMessageTime}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-slate-500 truncate leading-snug">{doctor.lastMessage}</p>
                {doctor.unread > 0 && (
                    <span className="shrink-0 text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-blue-300/40">
                        {doctor.unread}
                    </span>
                )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{doctor.specialty}</p>
        </div>
    </button>
);

// ─── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isPatient = message.sender === 'patient';

    return (
        <div className={cn('flex items-end gap-2 group', isPatient ? 'flex-row-reverse' : 'flex-row')}>
            <div
                className={cn(
                    'max-w-[72%] md:max-w-[60%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                    isPatient
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md',
                )}
            >
                <p>{message.text}</p>
                <div className={cn('flex items-center gap-1 mt-1', isPatient ? 'justify-end' : 'justify-start')}>
                    <span className={cn('text-[10px]', isPatient ? 'text-blue-200' : 'text-slate-400')}>
                        {message.timestamp}
                    </span>
                    {isPatient && message.status === 'read' && (
                        <span className="text-blue-300">
                            <CheckDoubleIcon />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Date Divider ──────────────────────────────────────────────────────────────

const DateDivider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">{label}</span>
        <div className="h-px flex-1 bg-slate-100" />
    </div>
);

// ─── Empty Chat State ──────────────────────────────────────────────────────────

const EmptyChatState = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <EmptyMessagesIcon />
        </div>
        <div>
            <h3 className="text-base font-semibold text-slate-700">Your messages</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                Select a conversation with one of your doctors to get started.
            </p>
        </div>
    </div>
);

// ─── Typing Indicator ──────────────────────────────────────────────────────────

const TypingIndicator = () => (
    <div className="flex items-end gap-2">
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
    </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

const MsgTest = () => {
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDoctors = MOCK_DOCTORS.filter(
        d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.specialty.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalUnread = MOCK_DOCTORS.reduce((acc, d) => acc + d.unread, 0);

    return (
        <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">

            {/* ── Left Panel: Doctor List ── */}
            <aside className="w-full max-w-[320px] shrink-0 flex flex-col border-r border-slate-100">

                {/* Panel Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Messages</h2>
                            {totalUnread > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    <span className="font-semibold text-blue-600">{totalUnread}</span> unread
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-medium">
                                {MOCK_DOCTORS.length} doctors
                            </span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <SearchIcon />
                        </span>
                        <input
                            id="doctor-search"
                            type="text"
                            placeholder="Search doctors..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredDoctors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                            <SearchIcon />
                            <p className="text-sm text-slate-400">No doctors match your search.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filteredDoctors.map(doctor => (
                                <DoctorListItem
                                    key={doctor.id}
                                    doctor={doctor}
                                    isActive={selectedDoctor?.id === doctor.id}
                                    onClick={() => setSelectedDoctor(doctor)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* HIPAA Notice */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                        �' Messages are encrypted and HIPAA-compliant
                    </p>
                </div>
            </aside>

            {/* ── Right Panel: Chat Area ── */}
            <section className="flex-1 flex flex-col min-w-0">
                {selectedDoctor ? (
                    <>
                        {/* Chat Header */}
                        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
                            <div className="flex items-center gap-3 min-w-0">
                                <DoctorAvatar doctor={selectedDoctor} size="lg" />
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 truncate">{selectedDoctor.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-slate-500">{selectedDoctor.specialty}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className={cn('text-xs font-medium', selectedDoctor.isOnline ? 'text-emerald-600' : 'text-slate-400')}>
                                            {selectedDoctor.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    id="btn-voice-call"
                                    aria-label="Start voice call"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <PhoneIcon />
                                </button>
                                <button
                                    id="btn-video-call"
                                    aria-label="Start video call"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <VideoIcon />
                                </button>
                                <button
                                    id="btn-chat-info"
                                    aria-label="View doctor information"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <InfoIcon />
                                </button>
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div
                            id="chat-messages-area"
                            className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3 bg-bg-surface"
                            role="log"
                            aria-label="Chat messages"
                            aria-live="polite"
                        >
                            <DateDivider label="Yesterday" />
                            {selectedDoctor.messages.slice(0, 3).map(msg => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}

                            <DateDivider label="Today" />
                            {selectedDoctor.messages.slice(3).map(msg => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}

                            {/* Typing indicator (shown for doctors who are online) */}
                            {selectedDoctor.isOnline && (
                                <div className="mt-1">
                                    <TypingIndicator />
                                </div>
                            )}
                        </div>

                        {/* Urgent Note Banner */}
                        <div className="px-6 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <p className="text-[11px] text-amber-700 font-medium">
                                For medical emergencies, please call 911 or visit your nearest emergency room immediately.
                            </p>
                        </div>

                        {/* Message Input */}
                        <footer className="px-5 py-4 border-t border-slate-100 bg-white">
                            <div className="flex items-end gap-3">
                                {/* Attachment Buttons */}
                                <div className="flex items-center gap-1 pb-1">
                                    <button
                                        id="btn-attach-file"
                                        aria-label="Attach a file"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <AttachIcon />
                                    </button>
                                    <button
                                        id="btn-attach-image"
                                        aria-label="Attach an image"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <ImageIcon />
                                    </button>
                                </div>

                                {/* Text Input */}
                                <div className="flex-1 relative">
                                    <textarea
                                        id="message-input"
                                        rows={1}
                                        placeholder={`Message ${selectedDoctor.name.split(' ')[1] ?? selectedDoctor.name}...`}
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                // message logic will be implemented separately
                                            }
                                        }}
                                        aria-label="Type your message"
                                        className="w-full resize-none px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150 leading-relaxed max-h-32"
                                        style={{ scrollbarWidth: 'thin' }}
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    id="btn-send-message"
                                    aria-label="Send message"
                                    disabled={!inputValue.trim()}
                                    className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                                        inputValue.trim()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                                    )}
                                >
                                    <SendIcon />
                                </button>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                                Press <kbd className="px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono">Shift+Enter</kbd> for new line
                            </p>
                        </footer>
                    </>
                ) : (
                    <EmptyChatState />
                )}
            </section>
        </div>
    );
};

export default MsgTest;