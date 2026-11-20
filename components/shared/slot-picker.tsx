'use client';

import { useEffect, useState } from 'react';
import { LoaderIcon } from 'lucide-react';
import { getAvailableSlots } from '@/actions/schedule.action';
import type { SlotAvailability } from '@/lib/scheduling';
import { WEEKDAY_LABELS, formatDayHours, weekdayOf } from '@/lib/clinic-hours';
import { cn } from '@/lib/utils';

/**
 * Time slots for one day, loaded from the server so they reflect clinic hours,
 * the clinician's own hours and existing bookings. Booked times are shown but
 * can't be picked.
 */
export default function SlotPicker({
  dateKey,
  doctorId,
  appointmentId,
  value,
  onChange,
}: {
  /** "yyyy-mm-dd" or "" when no date is chosen yet */
  dateKey: string;
  /** Booking: the chosen clinician (or "any_available"). */
  doctorId?: string;
  /** Rescheduling: the appointment being moved (its own slot counts as free). */
  appointmentId?: string;
  value: string;
  onChange: (time: string) => void;
}) {
  // The result is tagged with the request it answers; while it doesn't match the
  // current request, the picker shows "Checking availability…".
  const [state, setState] = useState<{ key: string; availability: SlotAvailability | null; error: string | null }>({
    key: '',
    availability: null,
    error: null,
  });
  const requestKey = `${dateKey}|${doctorId ?? ''}|${appointmentId ?? ''}`;

  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    getAvailableSlots({ date: dateKey, doctorId, appointmentId }).then(res => {
      if (cancelled) return;
      if (res.success) setState({ key: requestKey, availability: res.availability, error: null });
      else setState({ key: requestKey, availability: null, error: res.message });
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, doctorId, appointmentId, requestKey]);

  // A time picked for another day/clinician may not be free here.
  const availability = state.key === requestKey ? state.availability : null;
  useEffect(() => {
    if (!value || !availability) return;
    if (!availability.slots.some(s => s.time === value && s.status === 'free')) onChange('');
  }, [availability, value, onChange]);

  if (!dateKey) {
    return <p className='rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500'>Choose a date to see available times.</p>;
  }
  if (state.key !== requestKey) {
    return (
      <p className='flex items-center justify-center gap-2 rounded-lg border border-slate-100 px-4 py-6 text-sm text-slate-500'>
        <LoaderIcon className='size-4 animate-spin' aria-hidden /> Checking availability…
      </p>
    );
  }
  if (state.error || !availability) {
    return <p className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700'>{state.error ?? 'Could not load times.'}</p>;
  }

  const day = WEEKDAY_LABELS[weekdayOf(new Date(`${dateKey}T00:00:00.000Z`))];
  if (availability.slots.length === 0) {
    const message =
      availability.closedReason === 'clinic_closed'
        ? `The clinic is closed on ${day}s. Please choose another day.`
        : availability.closedReason === 'clinician_off'
          ? `This clinician doesn’t work on ${day}s. Please choose another day.`
          : 'No times left on this day. Please choose another day.';
    return <p className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800'>{message}</p>;
  }

  const freeCount = availability.slots.filter(s => s.status === 'free').length;
  return (
    <div>
      <p className='mb-2 text-xs text-slate-500'>
        {day}: {formatDayHours(availability.hours)} · {freeCount} time{freeCount === 1 ? '' : 's'} free
      </p>
      <div role='radiogroup' aria-label='Available times' className='grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-2'>
        {availability.slots.map(({ time, status }) => {
          const booked = status === 'booked';
          return (
            <button
              key={time}
              type='button'
              role='radio'
              aria-checked={value === time}
              disabled={booked}
              aria-label={booked ? `${time}, already booked` : time}
              onClick={() => onChange(time)}
              className={cn(
                'rounded-lg border px-3 py-2 text-center text-sm transition-colors',
                booked
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 line-through'
                  : value === time
                    ? 'cursor-pointer border-blue-600 bg-blue-600 text-white'
                    : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600',
              )}>
              {time}
              {booked && <span className='block text-[10px] no-underline'>Booked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
