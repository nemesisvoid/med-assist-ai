'use client';

import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn, formatEnums } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Sub-components
import PatientAppointmentJourney from './patient-appointment-journey';
import PatientMedicalResults from './patient-medical-results';
import PatientAppointmentSidebar from './patient-appointment-sidebar';

// Shared types
import { Appointment } from './patient-appointment-types';

type Props = {
  appointment: Appointment;
};

export default function PatientAppointmentDetails({ appointment }: Props) {
  const isCompleted = appointment.status === 'COMPLETED';
  const isCancelled = appointment.status === 'CANCELLED';

  const doctor = appointment.doctor;
  const doctorProfile = doctor?.doctorProfile;

  
  return (
    <div className='space-y-6 max-w-4xl mx-auto py-6 px-4 sm:px-6'>

      {/* ── STATUS HEADER ──────────────────────────────────────────── */}
      <div className='bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden'>
        <div className={cn(
          'h-1.5 w-full',
          isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
            isCancelled ? 'bg-slate-200' :
              'bg-gradient-to-r from-blue-500 to-indigo-500',
        )} />

        <div className='p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <Avatar className='size-14 border-2 border-slate-100 shadow-sm shrink-0'>
              <AvatarImage src={doctorProfile?.imageUrl || ''} alt={doctor?.name || 'Doctor'} />
              <AvatarFallback className='bg-gradient-to-br from-blue-50 to-indigo-100 text-indigo-700 font-bold text-sm'>
                {doctor?.name ? doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'DR'}
              </AvatarFallback>
            </Avatar>

            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2 mb-1'>
                <h1 className='text-base font-bold text-slate-800 tracking-tight truncate'>
                  {appointment.appointmentType} Consultation
                </h1>
                <Badge className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                  isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    isCancelled ? 'bg-slate-100 text-slate-500 border-slate-200' :
                      'bg-blue-50 text-blue-700 border-blue-200',
                )}>
                  {formatEnums(appointment.status)}
                </Badge>
              </div>

              <p className='text-xs text-slate-500 font-medium truncate'>
                {doctor ? `Dr. ${doctor.name}` : 'Doctor not yet assigned'}&nbsp;
                {doctorProfile?.specialty && (
                  <span className='text-slate-400'>· {doctorProfile.specialty}</span>
                )}
              </p>

              <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5'>
                <span className='text-xs text-slate-400 font-medium flex items-center gap-1'>
                  <Calendar className='size-3' />
                  {new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
                {appointment.scheduledTime && (
                  <span className='text-xs text-slate-400 font-medium flex items-center gap-1'>
                    <Clock className='size-3' />
                    {appointment.scheduledTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isCompleted && (
            <div className='flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0'>
              <CheckCircle2 className='size-4' />
              Visit Complete
            </div>
          )}
        </div>
      </div>

      {/* ── JOURNEY (stepper + live status) ───────────────────────── */}
      <PatientAppointmentJourney
        status={appointment.status}
        isCompleted={isCompleted}
        isCancelled={isCancelled}
      />

      {/* ── MAIN GRID ─────────────────────────────────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'>
        {/* Medical results — left/main column */}
        <div className='lg:col-span-2'>
          <PatientMedicalResults
            appointment={appointment}
            isCompleted={isCompleted}
            isCancelled={isCancelled}
          />
        </div>

        {/* Sidebar — care team, details, follow-up */}
        <PatientAppointmentSidebar
          appointment={appointment}
          isCompleted={isCompleted}
          isCancelled={isCancelled}
        />
      </div>
    </div>
  );
}
