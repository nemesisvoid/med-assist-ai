import * as z from 'zod';
import { Controller, UseFormReturn } from 'react-hook-form';
import { InfoIcon, MapPinIcon, VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { AppointmentFormSchema } from '@/validations/validation';
import { VISIT_TYPE } from '@/constants';
import type { BookingClinicInfo } from './patient-appointment-form';

interface VisitTypeProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
  clinic: BookingClinicInfo;
}
const VisitType = ({ form, clinic }: VisitTypeProps) => {
  const modes = [
    clinic.inPersonEnabled && {
      value: 'IN_PERSON' as const,
      label: 'In person',
      hint: clinic.addressLines.length ? `At ${clinic.name}, ${clinic.addressLines[0]}` : `At ${clinic.name}`,
      Icon: MapPinIcon,
    },
    clinic.videoEnabled && {
      value: 'VIDEO' as const,
      label: 'Video consultation',
      hint: 'See your clinician from home on a secure video call',
      Icon: VideoIcon,
    },
  ].filter(Boolean) as { value: 'IN_PERSON' | 'VIDEO'; label: string; hint: string; Icon: typeof VideoIcon }[];

  return (
    <div className='my-10 mx-auto w-full max-w-2xl space-y-10'>
      <Controller
        name='visitMode'
        control={form.control}
        render={({ field, fieldState }) => (
          <fieldset>
            <legend className='font-semibold text-lg text-text-base mb-4'>How would you like to be seen?</legend>
            <div role='radiogroup' className='grid gap-3 sm:grid-cols-2'>
              {modes.map(({ value, label, hint, Icon }) => (
                <button
                  key={value}
                  type='button'
                  role='radio'
                  aria-checked={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    field.value === value ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}>
                  <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600'>
                    <Icon className='size-4' aria-hidden />
                  </span>
                  <span>
                    <span className='block font-semibold text-slate-900'>{label}</span>
                    <span className='block text-xs text-text-muted'>{hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {field.value === 'VIDEO' && (
              <p className='mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
                <InfoIcon className='mt-0.5 size-3.5 shrink-0' aria-hidden />
                <span>
                  Video works best for non-urgent issues, follow-ups and talking therapies. If you have severe symptoms,
                  book in person. For emergencies, call {clinic.emergencyNumber ?? 'your local emergency number'} straight away.
                </span>
              </p>
            )}
            {fieldState.error && <p className='mt-2 text-xs font-medium text-red-600'>{fieldState.error.message}</p>}
          </fieldset>
        )}
      />

      <Controller
        name='appointmentType'
        control={form.control}
        render={({ field, fieldState }) => {
          return (
            <div>
              <h3 className='font-semibold text-lg text-text-base mb-6'>What brings you in today?</h3>

              <div className='grid gap-5 sm:grid-cols-2'>
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
