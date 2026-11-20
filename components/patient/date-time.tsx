import * as z from 'zod';
import { useCallback } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { CalendarIcon, ClockIcon, InfoIcon } from 'lucide-react';
import { WEEKDAYS, WEEKDAY_LABELS, type OpeningHours } from '@/lib/clinic-hours';
import SlotPicker from '@/components/shared/slot-picker';

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
  const doctor = form.watch('doctor');

  const dateKey = scheduledAt instanceof Date && !isNaN(scheduledAt.getTime()) ? scheduledAt.toISOString().slice(0, 10) : '';
  const openDays = WEEKDAYS.filter(d => openingHours[d]).map(d => WEEKDAY_LABELS[d]);
  const setTime = useCallback((time: string) => form.setValue('scheduledTime', time, { shouldValidate: !!time }), [form]);

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
          {/* Slots come from the server: clinic hours, the clinician's own hours and existing bookings. */}
          <SlotPicker dateKey={dateKey} doctorId={doctor || undefined} value={scheduledTime} onChange={setTime} />
        </div>
      </div>
    </div>
  );
};

export default DateTime;
