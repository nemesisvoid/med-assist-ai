import * as z from 'zod';
import { Controller, UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { AppointmentFormSchema } from '@/validations/validation';
import { VISIT_TYPE } from '@/constants';

interface VisitTypeProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
}
const VisitType = ({ form }: VisitTypeProps) => {
  return (
    <div className='my-10'>
      <Controller
        name='appointmentType'
        control={form.control}
        render={({ field, fieldState }) => {
          return (
            <div className='mx-auto w-1/2'>
              <h3 className='font-semibold text-lg text-text-base mb-6'>What brings you in today?</h3>

              <div className='grid grid-cols-2 gap-5 '>
                {VISIT_TYPE.map(item => (
                  <button
                    key={item.desc}
                    onClick={() => field.onChange(item.name)}
                    type='button'
                    className={cn(
                      `bg-white border border-gray-300 rounded-lg p-3`,
                      field.value === item.name && `${item.bgColor} ${item.borderColor}`,
                    )}>
                    <div className='flex gap-4'>
                      <div
                        className={cn(
                          'bg-accent-hover/10 flex items-center justify-center rounded-lg self-start size-8',
                          item.name === field.value && `${item.iconBgColor}`,
                        )}>
                        {<item.icon size={18} />}
                      </div>
                      <div className='flex flex-col'>
                        <p className='self-start font-medium'>{item.name}</p>
                        <span className='text-xs font-medium text-text-muted'>{item.desc}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default VisitType;
