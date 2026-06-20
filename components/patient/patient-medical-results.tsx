import { Stethoscope, ClipboardList, Pill, Calendar, Activity, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Appointment } from './patient-appointment-types';

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function SkeletonPending({ label }: { label: string }) {
  return (
    <div className='rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-2.5'>
      <div className='flex items-center gap-2 mb-1'>
        <div className='size-1.5 rounded-full bg-slate-300' />
        <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>{label}</span>
      </div>
      <div className='h-3 bg-slate-200/70 rounded-full w-3/4 animate-pulse' />
      <div className='h-3 bg-slate-200/70 rounded-full w-1/2 animate-pulse' />
    </div>
  );
}

// ─── Pending overview grid ────────────────────────────────────────────────────

function PendingMedicalSections() {
  const sections = [
    { icon: Stethoscope, label: 'Diagnosis', color: 'blue' },
    { icon: ClipboardList, label: 'Treatment Plan', color: 'emerald' },
    { icon: Pill, label: 'Prescriptions', color: 'violet' },
    { icon: Calendar, label: 'Follow-Up', color: 'amber' },
  ];

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2 mb-1'>
        <Activity className='size-3.5 text-slate-400' />
        <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest'>Medical Results</h3>
        <Badge className='text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0'>
          Pending
        </Badge>
      </div>
      <p className='text-xs text-slate-400 leading-relaxed'>
        Your detailed medical results, diagnosis, treatment plan, and prescriptions will appear here once your appointment is completed by your doctor.
      </p>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4'>
        {sections.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className='relative overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white p-4 space-y-3'>
            <div className={cn(
              'inline-flex p-2 rounded-lg',
              color === 'blue' && 'bg-blue-50 text-blue-400',
              color === 'emerald' && 'bg-emerald-50 text-emerald-400',
              color === 'violet' && 'bg-violet-50 text-violet-400',
              color === 'amber' && 'bg-amber-50 text-amber-400',
            )}>
              <Icon className='size-3.5' />
            </div>
            <div className='space-y-2'>
              <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>{label}</p>
              <div className='h-2.5 bg-slate-100 rounded-full w-4/5 animate-pulse' />
              <div className='h-2.5 bg-slate-100 rounded-full w-3/5 animate-pulse' />
            </div>
            <div className='absolute top-2.5 right-2.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100'>
              Not yet available
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  appointment: Appointment;
  isCompleted: boolean;
  isCancelled: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientMedicalResults({ appointment, isCompleted, isCancelled }: Props) {
  const clinicalNote = appointment.clinicalNote;
  const prescriptions = clinicalNote?.prescriptions ?? [];

  return (
    <div className='space-y-5'>

      {/* ── VISIT SUMMARY ────────────────────────────────────────── */}
      {isCompleted && clinicalNote?.patientSummaryNote && (
        <Card className='shadow-sm border-slate-100 overflow-hidden'>
          <CardHeader className='bg-gradient-to-r from-blue-50/80 to-indigo-50/40 border-b border-blue-100/60 px-5 py-4'>
            <div className='flex items-center gap-2.5'>
              <div className='p-1.5 bg-blue-100 rounded-lg text-blue-600'>
                <FileText className='size-4' />
              </div>
              <div>
                <h2 className='text-sm font-bold text-slate-800'>Your Visit Summary</h2>
                <p className='text-[11px] text-slate-500 font-medium'>A plain-language summary of your appointment</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-5'>
            <p className='text-sm text-slate-600 leading-relaxed whitespace-pre-line'>{clinicalNote.patientSummaryNote}</p>
          </CardContent>
        </Card>
      )}

      {/* ── DIAGNOSIS ────────────────────────────────────────────── */}
      <Card className='shadow-sm border-slate-100 overflow-hidden'>
        <CardHeader className={cn('border-b px-5 py-3.5', isCompleted ? 'bg-slate-50/60 border-slate-100' : 'bg-slate-50/60 border-slate-100')}>
          <div className='flex items-center gap-2'>
            <Stethoscope className={cn('size-4', isCompleted ? 'text-blue-600' : 'text-slate-400')} />
            <h2 className={cn('text-xs font-bold uppercase tracking-wider', isCompleted ? 'text-slate-700' : 'text-slate-400')}>
              Diagnosis
            </h2>
          </div>
        </CardHeader>
        <CardContent className='p-5'>
          {isCompleted ? (
            clinicalNote?.diagnosis ? (
              <p className='text-sm text-slate-700 font-medium leading-relaxed'>{clinicalNote.diagnosis}</p>
            ) : (
              <p className='text-sm text-slate-400 italic'>No formal diagnosis has been recorded for this visit.</p>
            )
          ) : (
            <SkeletonPending label='Pending doctor review' />
          )}
        </CardContent>
      </Card>

      {/* ── TREATMENT PLAN ───────────────────────────────────────── */}
      <Card className='shadow-sm border-slate-100 overflow-hidden'>
        <CardHeader className={cn('border-b px-5 py-3.5', isCompleted ? 'bg-emerald-50/40 border-emerald-100/60' : 'bg-slate-50/60 border-slate-100')}>
          <div className='flex items-center gap-2'>
            <ClipboardList className={cn('size-4', isCompleted ? 'text-emerald-600' : 'text-slate-400')} />
            <h2 className={cn('text-xs font-bold uppercase tracking-wider', isCompleted ? 'text-slate-700' : 'text-slate-400')}>
              Treatment Plan
            </h2>
          </div>
        </CardHeader>
        <CardContent className='p-5'>
          {isCompleted ? (
            clinicalNote?.treatmentPlan ? (
              <div className='space-y-2'>
                {clinicalNote.treatmentPlan.split('\n').filter(Boolean).map((step, i) => (
                  <div key={i} className='flex items-start gap-2.5'>
                    <div className='size-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold'>
                      {i + 1}
                    </div>
                    <p className='text-sm text-slate-600 leading-relaxed'>{step.replace(/^[-*\d.]+\s*/, '')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-slate-400 italic'>No treatment plan has been recorded for this visit.</p>
            )
          ) : (
            <SkeletonPending label='Not yet available' />
          )}
        </CardContent>
      </Card>

      {/* ── PRESCRIPTIONS ────────────────────────────────────────── */}
      <Card className='shadow-sm border-slate-100 overflow-hidden'>
        <CardHeader className={cn('border-b px-5 py-3.5', isCompleted ? 'bg-violet-50/40 border-violet-100/60' : 'bg-slate-50/60 border-slate-100')}>
          <div className='flex items-center gap-2'>
            <Pill className={cn('size-4', isCompleted ? 'text-violet-600' : 'text-slate-400')} />
            <h2 className={cn('text-xs font-bold uppercase tracking-wider', isCompleted ? 'text-slate-700' : 'text-slate-400')}>
              Prescriptions
            </h2>
            {isCompleted && prescriptions.length > 0 && (
              <Badge className='ml-1 text-[9px] font-bold bg-violet-100 text-violet-700 border-0 px-1.5 py-0'>
                {prescriptions.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className='p-5'>
          {isCompleted ? (
            prescriptions.length > 0 ? (
              <div className='space-y-3'>
                {prescriptions.map((rx, i) => (
                  <div
                    key={rx.id}
                    className='flex items-start gap-3.5 p-3.5 rounded-xl border border-violet-100 bg-violet-50/20 hover:bg-violet-50/40 transition-colors'>
                    <div className='size-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold'>
                      {i + 1}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-bold text-slate-800'>{rx.medicationName}</p>
                      <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-1'>
                        <span className='text-[11px] text-slate-500 font-medium'>
                          <span className='text-slate-400'>Dosage:</span> {rx.dosage}
                        </span>
                        <span className='text-[11px] text-slate-500 font-medium'>
                          <span className='text-slate-400'>Frequency:</span> {rx.frequency}
                        </span>
                        <span className='text-[11px] text-slate-500 font-medium'>
                          <span className='text-slate-400'>Duration:</span> {rx.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-slate-400 italic'>No medications were prescribed at this visit.</p>
            )
          ) : (
            <SkeletonPending label='Awaiting completion' />
          )}
        </CardContent>
      </Card>

      {/* Pre-completion full placeholder grid */}
      {!isCompleted && !isCancelled && (
        <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-5'>
          <PendingMedicalSections />
        </div>
      )}
    </div>
  );
}
