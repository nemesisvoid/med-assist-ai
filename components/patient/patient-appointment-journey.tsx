import { Activity, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Appointment, AppStatus, getLiveStatusConfig, LIFECYCLE_STEPS, STATUS_ORDER } from './patient-appointment-types';

// ─── Color Maps ───────────────────────────────────────────────────────────────

const liveColorMap: Record<string, string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  slate: 'bg-slate-50 border-slate-200 text-slate-600',
};

const liveIconColorMap: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  slate: 'bg-slate-100 text-slate-500',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  status: AppStatus;
  isCompleted: boolean;
  isCancelled: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientAppointmentJourney({ status, isCompleted, isCancelled }: Props) {
  const currentStepIndex = STATUS_ORDER[status] ?? 0;
  const liveStatus = getLiveStatusConfig(status);
  const LiveIcon = liveStatus.icon;

  return (
    <div className='space-y-4'>

      {/* ── CANCELLED BANNER ─────────────────────────────────────── */}
      {isCancelled && (
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3'>
          <div className='p-2 bg-slate-200 rounded-lg text-slate-500 shrink-0 mt-0.5'>
            <AlertCircle className='size-4' />
          </div>
          <div>
            <p className='text-sm font-bold text-slate-700'>Appointment Cancelled</p>
            <p className='text-xs text-slate-500 mt-0.5 leading-relaxed'>
              This appointment has been cancelled. Please book a new appointment or contact support if you need assistance.
            </p>
          </div>
        </div>
      )}

      {/* ── LIFECYCLE STEPPER ────────────────────────────────────── */}
      {!isCancelled && (
        <Card className='shadow-sm border-slate-100 bg-white overflow-hidden'>
          <CardHeader className='bg-slate-50/60 border-b border-slate-100 px-5 py-3.5'>
            <div className='flex items-center gap-2'>
              <Activity className='size-4 text-blue-600' />
              <span className='text-xs font-bold text-slate-700 uppercase tracking-wider'>Your Appointment Journey</span>
            </div>
          </CardHeader>
          <CardContent className='p-5'>
            {/* Desktop: horizontal stepper */}
            <div className='hidden sm:flex items-start gap-0'>
              {LIFECYCLE_STEPS.map((step, index) => {
                const isDone = STATUS_ORDER[status] > index;
                const isCurrent = STATUS_ORDER[status] === index;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className='flex-1 flex flex-col items-center relative'>
                    {index < LIFECYCLE_STEPS.length - 1 && (
                      <div className={cn(
                        'absolute top-4 left-1/2 w-full h-0.5 transition-colors duration-500',
                        isDone ? 'bg-emerald-400' : 'bg-slate-200',
                      )} />
                    )}
                    <div className={cn(
                      'relative z-10 size-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                        isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' :
                          'bg-white border-slate-200 text-slate-400',
                    )}>
                      {isDone ? (
                        <CheckCircle2 className='size-4' />
                      ) : isCurrent ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        <StepIcon className='size-3.5' />
                      )}
                    </div>
                    <div className='mt-2.5 text-center px-1'>
                      <p className={cn(
                        'text-[10px] font-bold leading-tight',
                        isDone ? 'text-emerald-600' :
                          isCurrent ? 'text-blue-700' :
                            'text-slate-400',
                      )}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: vertical stepper */}
            <div className='sm:hidden space-y-0'>
              {LIFECYCLE_STEPS.map((step, index) => {
                const isDone = STATUS_ORDER[status] > index;
                const isCurrent = STATUS_ORDER[status] === index;
                const StepIcon = step.icon;
                const isLast = index === LIFECYCLE_STEPS.length - 1;

                return (
                  <div key={step.key} className='flex gap-3.5'>
                    <div className='flex flex-col items-center'>
                      <div className={cn(
                        'size-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300',
                        isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                          isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' :
                            'bg-white border-slate-200 text-slate-400',
                      )}>
                        {isDone ? <CheckCircle2 className='size-3.5' /> :
                          isCurrent ? <Loader2 className='size-3.5 animate-spin' /> :
                            <StepIcon className='size-3' />}
                      </div>
                      {!isLast && (
                        <div className={cn(
                          'w-0.5 h-8 transition-colors duration-500',
                          isDone ? 'bg-emerald-400' : 'bg-slate-200',
                        )} />
                      )}
                    </div>
                    <div className='pb-6 pt-0.5 min-w-0'>
                      <p className={cn(
                        'text-xs font-bold',
                        isDone ? 'text-emerald-600' :
                          isCurrent ? 'text-blue-700' :
                            'text-slate-400',
                      )}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className='text-[11px] text-slate-500 mt-0.5 leading-relaxed'>{step.patientLabel}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current step description — desktop only */}
            {!isCompleted && (
              <div className='hidden sm:block mt-5 pt-4 border-t border-slate-100'>
                <p className='text-xs text-slate-500 font-medium text-center leading-relaxed'>
                  {LIFECYCLE_STEPS[currentStepIndex]?.patientLabel ?? ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── LIVE STATUS CARD ─────────────────────────────────────── */}
      {!isCompleted && !isCancelled && (
        <div className={cn(
          'rounded-xl border p-4 flex items-start gap-3.5',
          liveColorMap[liveStatus.color] || liveColorMap['slate'],
        )}>
          <div className={cn(
            'p-2.5 rounded-xl shrink-0',
            liveIconColorMap[liveStatus.color] || liveIconColorMap['slate'],
          )}>
            <LiveIcon className={cn('size-5', liveStatus.pulse && 'animate-pulse')} />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <p className='text-sm font-bold'>{liveStatus.title}</p>
              {liveStatus.pulse && (
                <span className='inline-flex gap-1 items-center text-[10px] font-bold uppercase tracking-wider opacity-70'>
                  <span className='size-1.5 rounded-full bg-current animate-ping' />
                  Live
                </span>
              )}
            </div>
            <p className='text-xs mt-1 leading-relaxed opacity-80'>{liveStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
