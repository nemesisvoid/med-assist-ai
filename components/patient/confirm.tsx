'use client';
import * as z from 'zod';

import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';

import { FileTextIcon, LoaderIcon } from 'lucide-react';

import { AppointmentFormSchema } from '@/validations/validation';
import { getDoctorById } from '@/actions/doctor.action';
import { useEffect, useState } from 'react';

interface ConfirmProps {
  form: UseFormReturn<z.infer<typeof AppointmentFormSchema>>;
}

const Confirm = ({ form }: ConfirmProps) => {
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>('');
  const values = form.getValues();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    async function getDoc() {
      try {
        setIsPending(true);
        const doctor = await getDoctorById(values.doctor);
        setSelectedDoctor(doctor);
        setIsPending(false);
      } catch (error) {
        setIsPending(false);
      } finally {
        setIsPending(false);
      }
    }
    getDoc();
  }, [values.doctor]);
  console.log(selectedDoctor);

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto'>
      <div className='text-center mb-6'>
        <div className='w-16 h-16 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4'>
          <FileTextIcon
            className='text-success'
            size={32}
          />
        </div>
        <h3 className='font-semibold text-xl text-text-base'>Review your details</h3>
        <p className='text-text-muted text-sm'>Please confirm your appointment information below.</p>
      </div>

      <div className='bg-white border border-border-subtle rounded-xl p-6 space-y-4 shadow-sm'>
        <div className='flex justify-between border-b border-border-subtle pb-4'>
          <span className='text-text-muted text-sm'>Appointment Type</span>
          <span className='font-medium text-text-base'>{values.appointmentType || 'Not specified'}</span>
        </div>

        <div className='flex justify-between border-b border-border-subtle pb-4'>
          <span className='text-text-muted text-sm'>Visit Reason</span>
          <span className='font-medium text-text-base'>{values.appointmentReason || 'Not specified'}</span>
        </div>

        <div className='flex justify-between border-b border-border-subtle pb-4'>
          <span className='text-text-muted text-sm'>Doctor</span>
          <span className='font-medium text-text-base'>
            {isPending ? <LoaderIcon className='animate-spin size-4' /> : selectedDoctor?.user?.name || 'Any Available'}
          </span>
        </div>

        <div className='flex justify-between border-b border-border-subtle pb-4'>
          <span className='text-text-muted text-sm'>Date & Time</span>
          <div className='text-right'>
            <p className='font-medium text-text-base'>{values.scheduledAt ? format(values.scheduledAt, 'MMM dd, yyyy') : 'No date'}</p>
            <p className='text-sm text-text-muted'>{values.scheduledTime || 'No time'}</p>
          </div>
        </div>

        <div className='flex flex-col pt-2'>
          <span className='text-text-muted text-sm mb-1'>Symptoms/Notes</span>
          <p className='text-sm text-text-base bg-bg-app p-3 rounded-lg border border-border-subtle'>
            {values.symptoms || 'No additional details provided.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
