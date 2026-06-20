'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  CalendarDays,
  Clock,
  FileCheck2,
  ClipboardList,
  AlertTriangle,
  Stethoscope,
  ArrowRight,
  UserRound,
} from 'lucide-react';

import PatientIntakeForm from '@/components/patient/patient-intake-form';

type AppointmentCardProps = {
  appointmentId: string;
  doctor?: string | null;
  scheduledDate: Date;
  scheduledTime: string | null;
  date: Date;
  title?: string;
  desc?: string;
  intakeFormId?: string | null;
};

const AppointmentCard = ({
  appointmentId,
  doctor,
  scheduledDate,
  scheduledTime,
  title,
  desc,
  intakeFormId,
}: AppointmentCardProps) => {
  const hasIntake = !!intakeFormId;

  const formattedDate = (() => {
    try {
      return format(new Date(scheduledDate), 'EEE, MMM d, yyyy');
    } catch {
      return new Date(scheduledDate).toDateString();
    }
  })();

  return (
    <article
      aria-label={`Appointment: ${title ?? 'Consultation'} on ${formattedDate}`}
      className='group relative bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 overflow-hidden'
    >
      {/* Top status accent bar */}
      <div
        className={`h-[3px] w-full ${hasIntake ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
        aria-hidden='true'
      />

      <div className='p-5'>
        {/* ── Header Row ──────────────────────────────────── */}
        <div className='flex items-start justify-between gap-3'>

          {/* Icon + Primary Info */}
          <div className='flex items-start gap-3.5 min-w-0'>
            {/* Type Icon Badge */}
            <div
              className='shrink-0 p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 mt-0.5'
              aria-hidden='true'
            >
              <Stethoscope size={17} strokeWidth={2} />
            </div>

            {/* Title Block */}
            <div className='min-w-0 space-y-0.5'>
              <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                Appointment
              </p>
              <h3 className='text-sm font-bold text-slate-800 leading-snug truncate'>
                {title ?? 'Medical Consultation'}
              </h3>
              {desc && (
                <p className='text-xs text-slate-500 line-clamp-1 leading-relaxed'>
                  {desc}
                </p>
              )}
            </div>
          </div>

          {/* Intake Status Badge */}
          <div className='shrink-0'>
            {hasIntake ? (
              <span
                className='inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full'
                title='Intake form submitted'
              >
                <FileCheck2 size={12} aria-hidden='true' />
                Intake Done
              </span>
            ) : (
              <span
                className='inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full'
                title='Intake form required'
              >
                <AlertTriangle size={12} aria-hidden='true' />
                Action Needed
              </span>
            )}
          </div>
        </div>

        {/* ── Meta Row ────────────────────────────────────── */}
        <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'>
          {/* Doctor */}
          {doctor && (
            <div className='flex items-center gap-1.5 text-xs text-slate-500 font-medium'>
              <UserRound
                size={13}
                className='text-slate-400 shrink-0'
                aria-hidden='true'
              />
              <span className='truncate max-w-[160px]'>{doctor}</span>
            </div>
          )}

          {/* Date */}
          <div className='flex items-center gap-1.5 text-xs text-slate-500 font-medium'>
            <CalendarDays
              size={13}
              className='text-slate-400 shrink-0'
              aria-hidden='true'
            />
            <span>{formattedDate}</span>
          </div>

          {/* Time */}
          {scheduledTime && (
            <div className='flex items-center gap-1.5 text-xs text-slate-500 font-medium'>
              <Clock
                size={13}
                className='text-slate-400 shrink-0'
                aria-hidden='true'
              />
              <span>{scheduledTime}</span>
            </div>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div className='mt-4 border-t border-slate-100' aria-hidden='true' />

        {/* ── Action Row ──────────────────────────────────── */}
        <div className='mt-3.5 flex items-center justify-between gap-2'>

          {/* Left: Conditional Intake CTA */}
          <div>
            {!hasIntake ? (
              <PatientIntakeForm appointmentId={appointmentId} />
            ) : (
              <div className='flex items-center gap-1.5 text-xs text-slate-400 font-medium'>
                <ClipboardList size={13} aria-hidden='true' />
                <span>Intake form submitted</span>
              </div>
            )}
          </div>

          {/* Right: View Details Button */}
          <Link
            href={`/patient/appointment/${appointmentId}`}
            className='inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-100/80 hover:border-blue-200 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
            aria-label={`View full details for ${title ?? 'this appointment'}`}
          >
            View Details
            <ArrowRight size={13} aria-hidden='true' />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default AppointmentCard;
