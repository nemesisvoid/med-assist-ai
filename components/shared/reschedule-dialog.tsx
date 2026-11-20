'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClockIcon, LoaderIcon } from 'lucide-react';
import { toast } from 'sonner';

import { rescheduleAppointment } from '@/actions/schedule.action';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SlotPicker from '@/components/shared/slot-picker';
import { cn } from '@/lib/utils';

/** Reschedule an appointment to another free slot. Used by both the patient and the clinician. */
export default function RescheduleDialog({
  appointmentId,
  otherPartyName,
  currentLabel,
  triggerClassName,
  onRescheduled,
}: {
  appointmentId: string;
  /** Who gets notified, e.g. "Dr. Sarah Johnson" or "Grace Okafor". */
  otherPartyName: string | null;
  /** e.g. "Mon 23 Nov at 10:00 AM" */
  currentLabel: string;
  triggerClassName?: string;
  onRescheduled?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState('');
  const [time, setTime] = useState('');
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const submit = () => {
    startTransition(async () => {
      const res = await rescheduleAppointment({ appointmentId, date: dateKey, time });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setOpen(false);
      setDateKey('');
      setTime('');
      router.refresh();
      onRescheduled?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          triggerClassName,
        )}>
        <CalendarClockIcon className='size-3.5' aria-hidden />
        Reschedule
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Currently {currentLabel}.{otherPartyName ? ` ${otherPartyName} will be notified of the new time.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div>
            <label htmlFor={`reschedule-date-${appointmentId}`} className='mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500'>
              New date
            </label>
            <input
              id={`reschedule-date-${appointmentId}`}
              type='date'
              min={today}
              value={dateKey}
              onChange={e => setDateKey(e.target.value)}
              className='w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm'
            />
          </div>
          <div>
            <p className='mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500'>New time</p>
            <SlotPicker dateKey={dateKey} appointmentId={appointmentId} value={time} onChange={setTime} />
          </div>
        </div>

        <div className='mt-2 flex justify-end gap-2'>
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='h-9 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
            Keep current time
          </button>
          <button
            type='button'
            onClick={submit}
            disabled={!dateKey || !time || isPending}
            className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'>
            {isPending && <LoaderIcon className='size-4 animate-spin' aria-hidden />}
            Reschedule
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
