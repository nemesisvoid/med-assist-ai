import * as z from 'zod';

import { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AppointmentFormSchema } from '@/validations/validation';

interface DetailsProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
}

const Details = ({ form }: DetailsProps) => {
  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto'>
      <h3 className='font-semibold text-lg text-text-base mb-6'>Add clinical details</h3>

      <div className='space-y-5'>
        <div>
          <label className='block text-sm font-medium text-text-base mb-1'>Appointment Reason</label>
          <Controller
            name='appointmentReason'
            control={form.control}
            render={({ field }) => (
              <Input
                placeholder='e.g. Routine Checkup, Persistent Headache'
                className='bg-white border-border-subtle focus:ring-shadow-brand focus:border-accent-primary'
                {...field}
              />
            )}
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-text-base mb-1'>Describe your symptoms (Optional)</label>
          <Controller
            name='symptoms'
            control={form.control}
            render={({ field }) => (
              <Textarea
                placeholder='Briefly describe what you are experiencing...'
                className='bg-white border-[var(--color-border-subtle)] resize-none h-32 focus:ring-[var(--color-shadow-brand)] focus:border-[var(--color-accent-primary)]'
                {...field}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Details;
