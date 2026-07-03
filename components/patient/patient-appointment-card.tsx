'use client';

import Link from 'next/link';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import {
  CalendarDays,
  Clock,
  FileCheck2,
  ClipboardList,
  AlertTriangle,
  Stethoscope,
  ArrowRight,
  UserRound,
  CheckCircle2,
  XCircle,
  Activity,
  Hourglass,
} from 'lucide-react';

import PatientIntakeForm from '@/components/patient/patient-intake-form';

export type PatientAppointmentCardProps = {
  appointmentId: string;
  doctor?: string | null;
  scheduledAt: Date;
  scheduledTime: string | null;
  appointmentType: string;
  appointmentReason: string;
  intakeFormId?: string | null;
  status?: string | null;
};

// ── Status Config ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  accent: string;           // top border gradient
  badge: string;            // badge classes
  icon: React.ReactNode;
};

function getStatusConfig(status: string | null | undefined, isUpcoming: boolean): StatusConfig {
  const s = (status ?? '').toUpperCase();

  if (s === 'COMPLETED') {
    return {
      label: 'Completed',
      accent: 'from-emerald-400 to-teal-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 size={11} aria-hidden='true' />,
    };
  }
  if (s === 'CANCELLED') {
    return {
      label: 'Cancelled',
      accent: 'from-slate-300 to-slate-400',
      badge: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: <XCircle size={11} aria-hidden='true' />,
    };
  }
  if (s === 'IN_PROGRESS') {
    return {
      label: 'In Progress',
      accent: 'from-sky-400 to-blue-500',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: <Activity size={11} aria-hidden='true' className='animate-pulse' />,
    };
  }
  if (s === 'PENDING_INTAKE') {
    return {
      label: 'Action Needed',
      accent: 'from-amber-400 to-orange-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle size={11} aria-hidden='true' />,
    };
  }
  if (isUpcoming) {
    return {
      label: 'Upcoming',
      accent: 'from-accent-primary to-accent-secondary',
      badge: 'bg-accent-soft text-accent-primary border-accent-primary/20',
      icon: <Hourglass size={11} aria-hidden='true' />,
    };
  }
  return {
    label: 'Past',
    accent: 'from-slate-300 to-slate-400',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: <CalendarDays size={11} aria-hidden='true' />,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const PatientAppointmentCard = ({
  appointmentId,
  doctor,
  scheduledAt,
  scheduledTime,
  appointmentType,
  appointmentReason,
  intakeFormId,
  status,
}: PatientAppointmentCardProps) => {
  const hasIntake = !!intakeFormId;
  const upcoming = isFuture(scheduledAt);
  const past = isPast(scheduledAt);
  const isCompleted = (status ?? '').toUpperCase() === 'COMPLETED';
  const isCancelled = (status ?? '').toUpperCase() === 'CANCELLED';
  const isDimmed = isCompleted || isCancelled;

  const statusConfig = getStatusConfig(status, upcoming);

  const formattedDate = (() => {
    try {
      return format(new Date(scheduledAt), 'EEE, MMM d, yyyy');
    } catch {
      return new Date(scheduledAt).toDateString();
    }
  })();

  const relativeTime = (() => {
    try {
      return upcoming
        ? `in ${formatDistanceToNow(scheduledAt)}`
        : `${formatDistanceToNow(scheduledAt)} ago`;
    } catch {
      return '';
    }
  })();

  return (
    <article
      aria-label={`Appointment: ${appointmentType} on ${formattedDate}`}
      className={`
        group relative bg-white border rounded-2xl shadow-sm overflow-hidden
        transition-all duration-200
        ${isDimmed
          ? 'border-slate-200/60 opacity-75 hover:opacity-90 hover:shadow-md hover:border-slate-300/60'
          : 'border-slate-200/80 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-[1px]'
        }
      `}
    >
      {/* ── Top Accent Bar ───────────────────────────────────────── */}
      <div
        className={`h-[3px] w-full bg-gradient-to-r ${statusConfig.accent}`}
        aria-hidden='true'
      />

      <div className='p-5'>
        {/* ── Header Row ──────────────────────────────────────────── */}
        <div className='flex items-start justify-between gap-3'>

          {/* Icon + Title */}
          <div className='flex items-start gap-3.5 min-w-0'>
            <div
              className='shrink-0 p-2.5 rounded-xl bg-accent-soft text-accent-primary border border-accent-primary/15 mt-0.5'
              aria-hidden='true'
            >
              <Stethoscope size={16} strokeWidth={2} />
            </div>

            <div className='min-w-0 space-y-0.5'>
              <p className='text-[10px] font-bold text-text-soft uppercase tracking-widest'>
                Appointment
              </p>
              <h3 className='text-sm font-bold text-text-base leading-snug truncate'>
                {appointmentType ?? 'Medical Consultation'}
              </h3>
              {appointmentReason && (
                <p className='text-xs text-text-muted line-clamp-1 leading-relaxed'>
                  {appointmentReason}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className='shrink-0'>
            <span
              className={`
                inline-flex items-center gap-1.5 text-[11px] font-semibold
                px-2.5 py-1 rounded-full border
                ${statusConfig.badge}
              `}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* ── Meta Row ────────────────────────────────────────────── */}
        <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'>
          {doctor && (
            <div className='flex items-center gap-1.5 text-xs text-text-muted font-medium'>
              <UserRound size={13} className='text-text-soft shrink-0' aria-hidden='true' />
              <span className='truncate max-w-[160px]'>{doctor}</span>
            </div>
          )}

          <div className='flex items-center gap-1.5 text-xs text-text-muted font-medium'>
            <CalendarDays size={13} className='text-text-soft shrink-0' aria-hidden='true' />
            <span>{formattedDate}</span>
          </div>

          {scheduledTime && (
            <div className='flex items-center gap-1.5 text-xs text-text-muted font-medium'>
              <Clock size={13} className='text-text-soft shrink-0' aria-hidden='true' />
              <span>{scheduledTime}</span>
            </div>
          )}

          {relativeTime && (
            <div className='flex items-center gap-1.5 text-xs font-semibold'>
              <span
                className={`
                  px-2 py-0.5 rounded-md text-[11px] border font-semibold
                  ${upcoming
                    ? 'bg-accent-soft text-accent-primary border-accent-primary/20'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                  }
                `}
              >
                {relativeTime}
              </span>
            </div>
          )}
        </div>

        {/* ── Intake Progress ──────────────────────────────────────── */}
        {upcoming && !isCancelled && (
          <div className='mt-3.5'>
            <div className='flex items-center justify-between mb-1.5'>
              <span className='text-[10px] font-bold text-text-soft uppercase tracking-wider'>
                Pre-visit Intake
              </span>
              <span className={`text-[10px] font-bold ${hasIntake ? 'text-emerald-600' : 'text-amber-600'}`}>
                {hasIntake ? 'Complete' : 'Required'}
              </span>
            </div>
            <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hasIntake
                    ? 'w-full bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'w-[15%] bg-gradient-to-r from-amber-400 to-orange-400'
                }`}
                role='progressbar'
                aria-valuenow={hasIntake ? 100 : 15}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={hasIntake ? 'Intake form complete' : 'Intake form incomplete'}
              />
            </div>
          </div>
        )}

        {/* ── Divider ─────────────────────────────────────────────── */}
        <div className='mt-4 border-t border-slate-100' aria-hidden='true' />

        {/* ── Action Row ──────────────────────────────────────────── */}
        <div className='mt-3.5 flex items-center justify-between gap-2'>

          {/* Left: Intake CTA */}
          <div>
            {upcoming && !isCancelled ? (
              !hasIntake ? (
                <PatientIntakeForm appointmentId={appointmentId} />
              ) : (
                <div className='flex items-center gap-1.5 text-xs text-emerald-600 font-semibold'>
                  <FileCheck2 size={13} aria-hidden='true' />
                  <span>Intake submitted</span>
                </div>
              )
            ) : (
              <div className='flex items-center gap-1.5 text-xs text-text-soft font-medium'>
                <ClipboardList size={13} aria-hidden='true' />
                <span>{isCompleted ? 'Visit completed' : isCancelled ? 'Cancelled' : 'Past appointment'}</span>
              </div>
            )}
          </div>

          {/* Right: View Details */}
          <Link
            href={`/patient/appointment/${appointmentId}`}
            className='inline-flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:text-accent-hover bg-accent-soft hover:bg-accent-soft/80 border border-accent-primary/20 hover:border-accent-primary/40 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1'
            aria-label={`View full details for ${appointmentType ?? 'this appointment'}`}
          >
            View Details
            <ArrowRight size={13} aria-hidden='true' className='group-hover:translate-x-0.5 transition-transform duration-150' />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PatientAppointmentCard;
