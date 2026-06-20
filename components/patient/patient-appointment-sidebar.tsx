'use client';

import { useRouter } from 'next/navigation';
import { Calendar, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Appointment } from './patient-appointment-types';

type Props = {
  appointment: Appointment;
  isCompleted: boolean;
  isCancelled: boolean;
};

export default function PatientAppointmentSidebar({ appointment, isCompleted, isCancelled }: Props) {
  const router = useRouter();
  const doctor = appointment.doctor;
  const doctorProfile = doctor?.doctorProfile;
  const followUp = appointment.followUp;

  return (
    <div className='space-y-5'>

      {/* ── CARE TEAM ────────────────────────────────────────────── */}
      <Card className='shadow-sm border-slate-100 overflow-hidden'>
        <CardHeader className='bg-slate-50/60 border-b border-slate-100 px-4 py-3.5'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='size-4 text-indigo-600' />
            <span className='text-xs font-bold text-slate-700 uppercase tracking-wider'>Your Care Team</span>
          </div>
        </CardHeader>
        <CardContent className='p-4'>
          {doctor ? (
            <div className='flex items-center gap-3'>
              <Avatar className='size-10 border border-slate-200'>
                <AvatarImage src={doctorProfile?.imageUrl || ''} alt={doctor.name} />
                <AvatarFallback className='bg-indigo-50 text-indigo-700 font-bold text-xs'>
                  {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='text-sm font-bold text-slate-800 truncate'>Dr. {doctor.name}</p>
                {doctorProfile?.specialty && (
                  <p className='text-xs text-slate-500 truncate'>{doctorProfile.specialty}</p>
                )}
                {doctorProfile?.yearsOfExperience && (
                  <p className='text-[11px] text-slate-400'>{doctorProfile.yearsOfExperience} yrs experience</p>
                )}
              </div>
            </div>
          ) : (
            <div className='flex items-center gap-2.5 text-slate-400'>
              <div className='size-8 rounded-full bg-slate-100 flex items-center justify-center'>
                <User className='size-4' />
              </div>
              <p className='text-xs font-medium text-slate-400'>Doctor not yet assigned</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── APPOINTMENT DETAILS ───────────────────────────────────── */}
      <Card className='shadow-sm border-slate-100 overflow-hidden'>
        <CardHeader className='bg-slate-50/60 border-b border-slate-100 px-4 py-3.5'>
          <div className='flex items-center gap-2'>
            <Calendar className='size-4 text-slate-500' />
            <span className='text-xs font-bold text-slate-700 uppercase tracking-wider'>Appointment Details</span>
          </div>
        </CardHeader>
        <CardContent className='p-4 space-y-3'>
          {[
            { label: 'Type', value: appointment.appointmentType },
            { label: 'Reason', value: appointment.appointmentReason },
            {
              label: 'Date',
              value: new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              }),
            },
            { label: 'Time', value: appointment.scheduledTime || 'Not specified' },
            { label: 'Priority', value: appointment.priority },
          ].map(({ label, value }) => (
            <div key={label} className='flex justify-between gap-3 items-start'>
              <span className='text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0'>{label}</span>
              <span className='text-xs font-semibold text-slate-700 text-right'>{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── FOLLOW-UP (post-completion) ───────────────────────────── */}
      {isCompleted && appointment.requiresFollowUp && (
        <Card className='shadow-sm border-amber-200 bg-amber-50/30 overflow-hidden'>
          <CardHeader className='bg-amber-50 border-b border-amber-100 px-4 py-3.5'>
            <div className='flex items-center gap-2'>
              <Calendar className='size-4 text-amber-600' />
              <span className='text-xs font-bold text-amber-800 uppercase tracking-wider'>Follow-Up Required</span>
            </div>
          </CardHeader>
          <CardContent className='p-4 space-y-3.5'>
            {followUp ? (
              <>
                <div className='space-y-2'>
                  {followUp.reason && (
                    <div>
                      <p className='text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5'>Reason</p>
                      <p className='text-xs text-slate-700 font-medium leading-relaxed'>{followUp.reason}</p>
                    </div>
                  )}
                  {followUp.recommendedDate && (
                    <div>
                      <p className='text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5'>Recommended Date</p>
                      <p className='text-xs text-slate-700 font-semibold'>
                        {new Date(followUp.recommendedDate).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {followUp.additionalNotes && (
                    <div>
                      <p className='text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5'>Notes</p>
                      <p className='text-xs text-slate-600 leading-relaxed'>{followUp.additionalNotes}</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => router.push('/patient/appointment/create-appointment')}
                  className='w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer text-xs font-bold h-9 transition-colors'>
                  <Calendar className='size-3.5' />
                  Schedule Follow-Up Appointment
                  <ArrowRight className='size-3.5 ml-auto' />
                </Button>
                <p className='text-[10px] text-amber-700/70 text-center leading-relaxed'>
                  This opens the booking form. Your previous appointment will be referenced.
                </p>
              </>
            ) : (
              <>
                <p className='text-xs text-amber-700/80 leading-relaxed font-medium'>
                  Your doctor recommends a follow-up appointment. Please schedule one at your earliest convenience.
                </p>
                <Button
                  onClick={() => router.push('/patient/appointment/create-appointment')}
                  className='w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer text-xs font-bold h-9 transition-colors'>
                  <Calendar className='size-3.5' />
                  Schedule Follow-Up
                  <ArrowRight className='size-3.5 ml-auto' />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── FOLLOW-UP PLACEHOLDER (pre-completion) ───────────────── */}
      {!isCompleted && !isCancelled && (
        <Card className='shadow-sm border-slate-100 overflow-hidden opacity-60'>
          <CardHeader className='bg-slate-50/60 border-b border-slate-100 px-4 py-3.5'>
            <div className='flex items-center gap-2'>
              <Calendar className='size-4 text-slate-400' />
              <span className='text-xs font-bold text-slate-400 uppercase tracking-wider'>Follow-Up</span>
            </div>
          </CardHeader>
          <CardContent className='p-4'>
            <p className='text-xs text-slate-400 italic leading-relaxed'>
              Follow-up recommendations will appear here after your visit is completed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── CLINICAL GUARDRAIL NOTICE ─────────────────────────────── */}
      <div className='rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-[10px] text-slate-500 leading-relaxed'>
        <div className='flex gap-1.5 items-center text-indigo-700 uppercase tracking-wider mb-1.5 font-bold text-[10px]'>
          <ShieldCheck className='size-3.5 shrink-0' />
          MedAssist AI Health Notice
        </div>
        Information shown here is for reference only. Always follow your doctor's direct instructions. If you have urgent symptoms, please contact emergency services.
      </div>
    </div>
  );
}
