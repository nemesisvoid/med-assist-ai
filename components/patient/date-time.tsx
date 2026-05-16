import * as z from 'zod';
import { Controller, UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { AppointmentFormSchema } from '@/validations/validation';

interface DateTimeTypeProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
}

const DateTime = ({ form }: DateTimeTypeProps) => {
  const TIME_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:30 PM', '04:00 PM'];

  const isTimeValid = time => {
    const now = new Date();
    const selectedTime = new Date(time);
    if (selectedTime < now) {
      return false;
    }
    return true;
  };

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto'>
      <h3 className='font-semibold text-lg text-text-base mb-6'>When are you available?</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div>
          <label className='flex items-center gap-2 text-sm font-medium text-text-base mb-3'>
            <CalendarIcon
              size={16}
              className='text-accent-primary'
            />{' '}
            Select Date
          </label>
          <Controller
            name='scheduledAt'
            control={form.control}
            render={({ field }) => (
              <Input
                type='date'
                className='w-full border-border-strong focus:border-[var(--color-accent-primary)]'
                onChange={e => field.onChange(new Date(e.target.value))}
                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className='flex items-center gap-2 text-sm font-medium text-text-base mb-3'>
            <ClockIcon
              size={16}
              className='text-accent-primary'
            />{' '}
            Select Time
          </label>
          {/* Note: Storing time loosely in duration field or merging with Date for MVP */}
          <div className='grid grid-cols-2 gap-2 h-48 overflow-y-auto pr-2 custom-scrollbar'>
            {TIME_SLOTS.map(time => (
              <button
                key={time}
                type='button'
                // disabled={isTimeValid(time)}
                className={cn(
                  'py-2 px-3 text-sm rounded-lg border text-center transition-colors',
                  form.watch('scheduledTime') === time
                    ? 'border-accent-primary  bg-accent-primary text-white'
                    : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-base)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]',
                )}
                onClick={() => form.setValue('scheduledTime', time)}>
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTime;
