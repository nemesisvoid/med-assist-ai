'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  MessageSquarePlus,
  Stethoscope,
  CalendarDays,
  Clock,
  ChevronRight,
  LoaderCircle,
  UserRound,
  Search,
  ShieldCheck,
  X,
  TriangleAlert,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getAppointmentsForConversation, createOrOpenConversation } from '@/actions/message.action';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string;
  appointmentType: string;
  appointmentReason: string;
  scheduledAt: Date;
  scheduledTime: string | null;
  status: string;
  existingConversationId: string | null;
  partner: {
    id: string;
    name: string;
    image: string | null;
    specialty?: string | null;
    imageUrl?: string | null;
  } | null;
};

type StartConversationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userRole: string;
  /** Called after a conversation is successfully created so the parent can refresh and auto-select it */
  onConversationCreated: (conversationId: string) => void;
};

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  PENDING_INTAKE: { label: 'Intake Required', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  READY_FOR_REVIEW: { label: 'Under Review', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  ASSIGNED: { label: 'Doctor Assigned', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  IN_PROGRESS: { label: 'In Progress', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  NOTES_GENERATED: { label: 'Notes Ready', classes: 'bg-violet-50 text-violet-700 border-violet-200' },
  COMPLETED: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// ─── Main Dialog Component ─────────────────────────────────────────────────────

export default function StartConversationDialog({
  open,
  onOpenChange,
  userId,
  userRole,
  onConversationCreated,
}: StartConversationDialogProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filtered, setFiltered] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(false);
  const [hasPendingIntake, setHasPendingIntake] = useState(false);
  const [, startTransition] = useTransition();

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    setIsFetching(true);
    setSearchQuery('');
    getAppointmentsForConversation(userId, userRole)
      .then(res => {
        console.log(res)
        const appts = (res.data ?? []) as Appointment[];
        setAppointments(appts);
        setFiltered(appts);
        setHasPendingIntake(res.hasPendingIntake ?? false);
      })
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setIsFetching(false));
  }, [open, userId, userRole]);

  // Filter on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(appointments);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(
        appointments.filter(
          a =>
            a.partner?.name.toLowerCase().includes(q) ||
            a.appointmentType.toLowerCase().includes(q) ||
            a.appointmentReason.toLowerCase().includes(q),
        ),
      );
    }
  }, [searchQuery, appointments]);

  const handleStart = (appt: Appointment) => {
    if (!appt.partner) return;
    setLoadingId(appt.id);

    startTransition(async () => {
      try {
        const res = await createOrOpenConversation({
          patientId: userRole === 'PATIENT' ? userId : appt.partner!.id,
          doctorId: userRole === 'DOCTOR' ? userId : appt.partner!.id,
          appointmentId: appt.id,
        });
        if (!res.success || !res.data) {
          toast.error('Could not open conversation. Please try again.');
          return;
        }
        toast.success(`Conversation opened!`);
        onConversationCreated(res.data.id);
        onOpenChange(false);
      } catch {
        toast.error('Something went wrong.');
      } finally {
        setLoadingId(null);
      }
    });
  };

  const statusCfg = (status: string) => STATUS_CONFIG[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200 shadow-xl'
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className='px-6 pt-6 pb-0'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0'>
                <MessageSquarePlus size={18} strokeWidth={2} />
              </div>
              <div>
                <DialogTitle className='text-base font-bold text-slate-900 leading-tight'>
                  Start a Conversation
                </DialogTitle>
                <DialogDescription className='text-xs text-slate-500 mt-0.5'>
                  Select an appointment to open a secure channel with your doctor.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className='px-6 pt-4 pb-3'>
          <div className='relative'>
            <Search
              size={14}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
            <input
              id='conversation-search'
              type='text'
              placeholder='Search by doctor or appointment type...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'
            />
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className='h-px bg-slate-100 mx-0' />

        {/* ── Content Area ────────────────────────────────────────────── */}
        <div className='max-h-[380px] overflow-y-auto'>
          {isFetching ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasSearch={!!searchQuery.trim()}
              hasAppointments={appointments.length > 0}
              hasPendingIntake={hasPendingIntake}
            />
          ) : (
            <div className='py-2'>
              {filtered.map(appt => {
                const partner = appt.partner!;
                const isLoading = loadingId === appt.id;
                const cfg = statusCfg(appt.status);
                const initials = partner.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                const avatarSrc = partner.imageUrl ?? partner.image ?? '';

                let formattedDate = '';
                try { formattedDate = format(new Date(appt.scheduledAt), 'EEE, MMM d'); } catch { /* noop */ }

                const isPendingIntake = userRole === 'PATIENT' && appt.status === 'PENDING_INTAKE';
                const hasExistingConversation = !!appt.existingConversationId;

                const onClickButton = () => {
                  // console.log('a, b,c,d,c,d')
                  console.log()

                  if (isPendingIntake) {
                    onOpenChange(false);
                    router.push(`/patient/appointments/${appt.id}`);
                  } else if (hasExistingConversation) {
                    // Open the existing conversation directly
                    onConversationCreated(appt.existingConversationId!);
                    onOpenChange(false);
                  } else {
                    handleStart(appt);
                  }
                };

                return (
                  <button
                    key={appt.id}
                    id={`start-convo-${appt.id}`}
                    onClick={onClickButton}
                    disabled={!!loadingId}
                    aria-label={`Start conversation with ${partner.name} about ${appt.appointmentType}`}
                    className={cn(
                      'w-full text-left px-4 py-3.5 flex items-center gap-4',
                      'transition-all duration-150 cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                      'hover:bg-slate-50 active:bg-blue-50/60',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      'border-b border-slate-50 last:border-b-0',
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className='size-11 border border-slate-100 shadow-sm shrink-0'>
                      <AvatarImage src={avatarSrc} alt={partner.name} />
                      <AvatarFallback className='bg-gradient-to-br from-blue-50 to-indigo-100 text-indigo-700 font-bold text-xs'>
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-0.5'>
                        <span className='text-sm font-semibold text-slate-800 truncate'>
                          {partner.name}
                        </span>
                        {partner.specialty && (
                          <span className='text-[10px] text-slate-400 font-medium shrink-0 hidden sm:block'>
                            · {partner.specialty}
                          </span>
                        )}
                      </div>

                      <p className='text-xs text-slate-600 font-medium truncate'>
                        {appt.appointmentType}
                      </p>

                      <div className='flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5'>
                        <span className='flex items-center gap-1 text-[11px] text-slate-400'>
                          <CalendarDays size={11} />
                          {formattedDate}
                        </span>
                        {appt.scheduledTime && (
                          <span className='flex items-center gap-1 text-[11px] text-slate-400'>
                            <Clock size={11} />
                            {appt.scheduledTime}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] font-semibold border px-1.5 py-0.5 rounded-full',
                            cfg.classes,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Action indicator */}
                    <div className='shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors'>
                      {isLoading ? (
                        <LoaderCircle size={16} className='text-blue-600 animate-spin' />
                      ) : isPendingIntake ? (
                        <span className='text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200'>
                          Fill Intake Form
                        </span>
                      ) : hasExistingConversation ? (
                        <span className='text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200'>
                          Open Chat
                        </span>
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer HIPAA notice ──────────────────────────────────────── */}
        <div className='px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-center gap-1.5'>
          <ShieldCheck size={12} className='text-slate-400' />
          <p className='text-[11px] text-slate-400 text-center'>
            All messages are encrypted and HIPAA-compliant
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className='py-8 flex flex-col items-center gap-3'>
      <LoaderCircle size={22} className='text-blue-500 animate-spin' />
      <p className='text-sm text-slate-400'>Loading your appointments…</p>
    </div>
  );
}

function EmptyState({ hasSearch, hasAppointments, hasPendingIntake }: { hasSearch: boolean; hasAppointments: boolean; hasPendingIntake?: boolean }) {
  if (hasSearch) {
    return (
      <div className='py-10 px-6 flex flex-col items-center gap-3 text-center'>
        <div className='p-3 rounded-full bg-slate-100'>
          <Search size={20} className='text-slate-400' />
        </div>
        <p className='text-sm font-medium text-slate-700'>No results found</p>
        <p className='text-xs text-slate-400'>Try searching by doctor name or appointment type.</p>
      </div>
    );
  }

  if (!hasAppointments) {
    if (hasPendingIntake) {
      return (
        <div className='py-10 px-6 flex flex-col items-center gap-3 text-center'>
          <div className='p-3 rounded-full bg-amber-50'>
            <TriangleAlert size={20} className='text-amber-500' />
          </div>
          <p className='text-sm font-medium text-slate-700'>Action Required</p>
          <p className='text-xs text-slate-400 max-w-[280px]'>
            You have a pending appointment, but you must complete your intake form before a doctor can be assigned and messaging can begin. Please go to your appointments page to fill it out.
          </p>
        </div>
      );
    }

    return (
      <div className='py-10 px-6 flex flex-col items-center gap-3 text-center'>
        <div className='p-3 rounded-full bg-slate-50 border border-slate-100'>
          <TriangleAlert size={20} className='text-slate-400' />
        </div>
        <p className='text-sm font-medium text-slate-700'>No eligible appointments</p>
        <p className='text-xs text-slate-400 max-w-[280px]'>
          You can only message a doctor once they have been assigned to your appointment. Book an appointment or wait for a doctor to be assigned.
        </p>
      </div>
    );
  }

  return (
    <div className='py-10 px-6 flex flex-col items-center gap-3 text-center'>
      <div className='p-3 rounded-full bg-emerald-50'>
        <Stethoscope size={20} className='text-emerald-500' />
      </div>
      <p className='text-sm font-medium text-slate-700'>All caught up!</p>
      <p className='text-xs text-slate-400'>
        Conversations have already been started for all your current appointments.
      </p>
    </div>
  );
}
