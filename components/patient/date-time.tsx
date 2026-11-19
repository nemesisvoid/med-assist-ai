import * as z from 'zod';
import { useEffect, useMemo } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { CalendarIcon, ClockIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEEKDAYS, WEEKDAY_LABELS, formatDayHours, slotsForDay, weekdayOf, type OpeningHours } from '@/lib/clinic-hours';

import { AppointmentFormSchema } from '@/validations/validation';

interface DateTimeTypeProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
  /** Clinic opening hours and timezone (Admin → Clinic settings). */
  openingHours: OpeningHours;
  timezone: string;
}

const DateTime = ({ form, openingHours, timezone }: DateTimeTypeProps) => {
  const scheduledAt = form.watch('scheduledAt');
  const scheduledTime = form.watch('scheduledTime');

  const day = scheduledAt instanceof Date && !isNaN(scheduledAt.getTime()) ? weekdayOf(scheduledAt) : null;
  const slots = useMemo(() => (day ? slotsForDay(openingHours[day]) : []), [day, openingHours]);
  const openDays = WEEKDAYS.filter(d => openingHours[d]).map(d => WEEKDAY_LABELS[d]);

  // A time chosen for another day may not exist on the newly chosen one.
  useEffect(() => {
    if (scheduledTime && day && !slots.includes(scheduledTime)) form.setValue('scheduledTime', '');
  }, [day, slots, scheduledTime, form]);

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto'>
      <h3 className='font-semibold text-lg text-text-base mb-2'>When are you available?</h3>
      <p className='mb-6 flex items-center gap-1.5 text-xs text-text-muted'>
        <InfoIcon size={13} aria-hidden />
        Times are clinic time ({timezone.replace(/_/g, ' ')}).
      </p>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div>
          <label htmlFor='booking-date' className='flex items-center gap-2 text-sm font-medium text-text-base mb-3'>
            <CalendarIcon size={16} className='text-accent-primary' /> Select Date
          </label>
          <Controller
            name='scheduledAt'
            control={form.control}
            render={({ field }) => (
              <Input
                id='booking-date'
                type='date'
                className='w-full border-border-strong focus:border-[var(--color-accent-primary)]'
                onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
          />
          <p className='mt-3 text-xs text-text-muted'>
            Open {openDays.length ? openDays.join(', ') : 'by appointment only'}.
          </p>
        </div>

        {/* Time Selection */}
        <div>
          <p className='flex items-center gap-2 text-sm font-medium text-text-base mb-3'>
            <ClockIcon size={16} className='text-accent-primary' /> Select Time
          </p>
          {!day ? (
            <p className='rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-text-muted'>Choose a date to see available times.</p>
          ) : slots.length === 0 ? (
            <p className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800'>
              The clinic is closed on {WEEKDAY_LABELS[day]}s. Please choose another day.
            </p>
          ) : (
            <>
              <p className='mb-2 text-xs text-text-muted'>
                {WEEKDAY_LABELS[day]}: {formatDayHours(openingHours[day])}
              </p>
              <div role='radiogroup' aria-label='Available times' className='grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar'>
                {slots.map(time => (
                  <button
                    key={time}
                    type='button'
                    role='radio'
                    aria-checked={scheduledTime === time}
                    className={cn(
                      'py-2 px-3 text-sm rounded-lg border text-center transition-colors cursor-pointer',
                      scheduledTime === time
                        ? 'border-accent-primary bg-accent-primary text-white'
                        : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-base)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]',
                    )}
                    onClick={() => form.setValue('scheduledTime', time, { shouldValidate: true })}>
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateTime;
