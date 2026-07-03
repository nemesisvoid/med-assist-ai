import { isFuture, isPast, compareAsc, compareDesc } from 'date-fns';
import {
  CalendarClock,
  History,
  CalendarOff,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';

import PatientAppointmentCard from './patient/patient-appointment-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type PatientAppointmentItem = {
  appointmentId: string;
  scheduledAt: Date;
  scheduledTime: string | null;
  appointmentType: string;
  appointmentReason: string;
  intakeFormId?: string | null;
  doctor?: string | null;
  status?: string | null;
};

type PatientAppointmentsListProps = {
  appointments: PatientAppointmentItem[];
};

// ── Sort helper ───────────────────────────────────────────────────────────────

/**
 * For upcoming: soonest first.
 * For past: most recent first, but COMPLETED/CANCELLED pushed to the end.
 */
function sortUpcoming(items: PatientAppointmentItem[]): PatientAppointmentItem[] {
  return [...items].sort((a, b) => compareAsc(a.scheduledAt, b.scheduledAt));
}

function sortPast(items: PatientAppointmentItem[]): PatientAppointmentItem[] {
  const terminal = new Set(['COMPLETED', 'CANCELLED']);
  const isTerminal = (s: string | null | undefined) => terminal.has((s ?? '').toUpperCase());

  return [...items].sort((a, b) => {
    const aT = isTerminal(a.status);
    const bT = isTerminal(b.status);
    if (aT !== bT) return aT ? 1 : -1;      // terminal items sink to bottom
    return compareDesc(a.scheduledAt, b.scheduledAt); // most-recent first within group
  });
}

// ── Empty State ───────────────────────────────────────────────────────────────

const EmptyState = ({
  icon,
  heading,
  description,
}: {
  icon: React.ReactNode;
  heading: string;
  description: string;
}) => (
  <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
    <div className='w-14 h-14 rounded-2xl bg-bg-surface flex items-center justify-center mb-4 text-text-soft border border-slate-200'>
      {icon}
    </div>
    <h3 className='text-sm font-bold text-text-base mb-1'>{heading}</h3>
    <p className='text-xs text-text-muted max-w-[220px] leading-relaxed'>{description}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const PatientAppointmentsList = ({ appointments }: PatientAppointmentsListProps) => {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarOff size={26} />}
        heading='No appointments yet'
        description='Your scheduled appointments will appear here once booked.'
      />
    );
  }

  const upcomingRaw = appointments.filter(item => isFuture(item.scheduledAt));
  const pastRaw = appointments.filter(item => isPast(item.scheduledAt));

  const upcomingItems = sortUpcoming(upcomingRaw);
  const pastItems = sortPast(pastRaw);

  const upcomingCount = upcomingItems.length;
  const pastCount = pastItems.length;

  // ── Stats banner ─────────────────────────────────────────────────────────
  const completedCount = pastItems.filter(
    a => (a.status ?? '').toUpperCase() === 'COMPLETED',
  ).length;

  const pendingIntakeCount = upcomingItems.filter(
    a => !a.intakeFormId,
  ).length;

  return (
    <div className='space-y-6'>

      {/* ── Overview Cards ────────────────────────────────────────────── */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-white border border-slate-200/80 rounded-xl p-4 flex items-center gap-3 shadow-sm'>
          <div className='w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center shrink-0'>
            <Hourglass size={16} className='text-accent-primary' />
          </div>
          <div>
            <p className='text-xl font-bold text-text-base leading-none'>{upcomingCount}</p>
            <p className='text-[11px] text-text-muted font-medium mt-0.5'>Upcoming</p>
          </div>
        </div>

        <div className='bg-white border border-slate-200/80 rounded-xl p-4 flex items-center gap-3 shadow-sm'>
          <div className='w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0'>
            <CheckCircle2 size={16} className='text-emerald-600' />
          </div>
          <div>
            <p className='text-xl font-bold text-text-base leading-none'>{completedCount}</p>
            <p className='text-[11px] text-text-muted font-medium mt-0.5'>Completed</p>
          </div>
        </div>

        <div className='bg-white border border-slate-200/80 rounded-xl p-4 flex items-center gap-3 shadow-sm'>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pendingIntakeCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <CalendarClock size={16} className={pendingIntakeCount > 0 ? 'text-amber-600' : 'text-text-soft'} />
          </div>
          <div>
            <p className={`text-xl font-bold leading-none ${pendingIntakeCount > 0 ? 'text-amber-600' : 'text-text-base'}`}>
              {pendingIntakeCount}
            </p>
            <p className='text-[11px] text-text-muted font-medium mt-0.5'>Intake Pending</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue='upcoming' className='w-full'>

        {/* Tab Header */}
        <TabsList className='h-auto p-1 bg-bg-surface border border-slate-200/80 rounded-xl gap-1 w-full sm:w-auto'>
          <TabsTrigger
            value='upcoming'
            className='
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
              text-text-muted transition-all duration-150
              data-[state=active]:bg-white data-[state=active]:text-text-base
              data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/80
            '
          >
            <CalendarClock size={14} aria-hidden='true' />
            Upcoming
            {upcomingCount > 0 && (
              <span className='ml-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-accent-soft text-accent-primary rounded-full'>
                {upcomingCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value='history'
            className='
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
              text-text-muted transition-all duration-150
              data-[state=active]:bg-white data-[state=active]:text-text-base
              data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/80
            '
          >
            <History size={14} aria-hidden='true' />
            History
            {pastCount > 0 && (
              <span className='ml-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full'>
                {pastCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Upcoming Tab ──────────────────────────────────────────────── */}
        <TabsContent value='upcoming' className='mt-4'>
          {upcomingItems.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={26} />}
              heading='No upcoming appointments'
              description="You don't have any scheduled appointments. Book one to get started."
            />
          ) : (
            <div className='flex flex-col gap-3.5'>
              {upcomingItems.map(item => (
                <PatientAppointmentCard
                  key={item.appointmentId}
                  appointmentId={item.appointmentId}
                  doctor={item.doctor}
                  scheduledAt={item.scheduledAt}
                  scheduledTime={item.scheduledTime}
                  appointmentType={item.appointmentType}
                  appointmentReason={item.appointmentReason}
                  intakeFormId={item.intakeFormId}
                  status={item.status}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ───────────────────────────────────────────────── */}
        <TabsContent value='history' className='mt-4'>
          {pastItems.length === 0 ? (
            <EmptyState
              icon={<History size={26} />}
              heading='No past appointments'
              description='Your completed and past appointments will appear here.'
            />
          ) : (
            <div className='flex flex-col gap-3.5'>
              {/* Section label for non-terminal */}
              {pastItems.some(a => !['COMPLETED', 'CANCELLED'].includes((a.status ?? '').toUpperCase())) && (
                <p className='text-[11px] font-bold text-text-soft uppercase tracking-widest px-0.5'>
                  Recent
                </p>
              )}
              {pastItems.map((item, idx) => {
                const s = (item.status ?? '').toUpperCase();
                const isTerminal = s === 'COMPLETED' || s === 'CANCELLED';
                const prev = pastItems[idx - 1];
                const prevTerminal = prev ? ['COMPLETED', 'CANCELLED'].includes((prev.status ?? '').toUpperCase()) : false;
                const showSectionLabel = isTerminal && !prevTerminal;

                return (
                  <div key={item.appointmentId}>
                    {showSectionLabel && (
                      <p className='text-[11px] font-bold text-text-soft uppercase tracking-widest px-0.5 mb-3.5 mt-1'>
                        Completed &amp; Cancelled
                      </p>
                    )}
                    <PatientAppointmentCard
                      appointmentId={item.appointmentId}
                      doctor={item.doctor}
                      scheduledAt={item.scheduledAt}
                      scheduledTime={item.scheduledTime}
                      appointmentType={item.appointmentType}
                      appointmentReason={item.appointmentReason}
                      intakeFormId={item.intakeFormId}
                      status={item.status}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientAppointmentsList;
