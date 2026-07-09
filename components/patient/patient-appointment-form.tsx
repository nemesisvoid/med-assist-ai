'use client';

import { useState, useTransition } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useForm } from 'react-hook-form';
import { AppointmentFormSchema } from '@/validations/validation';

import { cn } from '@/lib/utils';
import { CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import SelectDoctor from './select-doctor';
import DateTime from './date-time';
import Details from './details';
import Confirm from './confirm';
import { Button } from '../ui/button';
import VisitType from './visit-type';
import { createAppointment } from '@/actions/patient.action';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AlertCircleIcon } from 'lucide-react';

const PatientAppointmentForm = ({ userId }) => {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const STEPS = ['Visit Type', 'Select Doctor', 'Date & Time', 'Details', 'Confirm'];
  const [isPending, startTransition] = useTransition();
  const [activeConflict, setActiveConflict] = useState(false);

  const form = useForm({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: {
      appointmentReason: '',
      appointmentType: '',
      scheduledAt: new Date(),
      scheduledTime: '',
      // duration: '',
      doctor: '',
      symptoms: '',
    },
  });

  const handleNext = async () => {
    let fieldsToValidate = [];

    switch (currentStep) {
      case 0:
        fieldsToValidate = ['appointmentType'];
        break;
      case 1:
        if (activeConflict) return; // Block navigation if there's a conflict
        fieldsToValidate = ['doctor'];
        break;
      case 2:
        fieldsToValidate = ['scheduleAt', 'duration'];
        break;
      case 3:
        fieldsToValidate = ['appointmentReason', 'symptoms'];
        break;
      default:
        break;
    }
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: z.infer<typeof AppointmentFormSchema>) => {
    console.log('click');

    startTransition(async () => {
      try {
        const res = await createAppointment(userId, data);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
        router.push('/patient/appointment');
      } catch (error) {
        console.log(error);
      }
    });
  };
  return (
    <div>
      <div className='mx-auto w-1/3'>
        <h2 className='text-xl font-bold mb-1'>Book an Appointment</h2>
        <p className='text-sm text-text-muted mb-8'>Complete the steps below to schedule your visit.</p>
      </div>

      <div className='flex items-center justify-center mb-12'>
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div
              key={step}
              className='flex items-center'>
              <div className='flex flex-col items-center relative group'>
                <div
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted
                      ? 'bg-success border-success text-white'
                      : isActive
                        ? 'bg-accent-soft border-accent-primary text-accent-primary'
                        : 'bg-white border-border-subtle text-text-muted',
                  )}>
                  {isCompleted ? (
                    <CheckIcon
                      className='size-5'
                      strokeWidth={3}
                    />
                  ) : (
                    <span className='font-medium'>{index + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    'absolute -bottom-6 text-xs font-medium whitespace-nowrap transition-colors',
                    isCompleted ? 'text-success' : isActive ? 'text-accent-primary' : 'text-text-muted',
                  )}>
                  {step}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-4 w-12 md:w-20 transition-all duration-300',
                    isCompleted ? 'border-t-2 border-success' : 'border-t-2 border-dashed border-border-subtle',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={form.handleSubmit(onSubmit, error => console.log('error', error))}>
        <div className='mx-auto'>
          {currentStep === 0 && <VisitType form={form} />}
          {currentStep === 1 && <SelectDoctor form={form} userId={userId} onConflict={setActiveConflict} />}
          {currentStep === 2 && <DateTime form={form} />}
          {currentStep === 3 && <Details form={form} />}
          {currentStep === 4 && <Confirm form={form} />}
        </div>

        <div className='flex items-center justify-between mt-10 pt-6 border-t border-border-subtle w-1/2 mx-auto'>
          <Button
            type='button'
            variant='outline'
            onClick={handlePrev}
            disabled={currentStep === 0 || isPending}
            className='text-text-muted bg-bg-canvas hover:text-text-base disabled:opacity-50 px-6 py-5'>
            <ChevronLeftIcon className='mr-1 size-4' /> Back
          </Button>

          {currentStep < STEPS.length - 1 && (
            <>
              {currentStep === 1 && activeConflict ? (
                <div className='flex items-center gap-2 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl'>
                  <AlertCircleIcon className='w-4 h-4 shrink-0' />
                  Active appointment with this doctor
                </div>
              ) : (
                <Button
                  type='button'
                  onClick={handleNext}
                  disabled={isPending || (currentStep === 1 && activeConflict)}
                  className='bg-accent-primary hover:bg-accent-hover text-white px-8 py-5'>
                  Continue <ChevronRightIcon className='ml-2 size-4' />
                </Button>
              )}
            </>
          )}

          {currentStep === STEPS.length - 1 && (
            <Button
              type='submit'
              disabled={isPending}
              className='bg-success hover:bg-[#0c855a] text-white px-8 py-5'>
              {isPending ? 'Confirming...' : 'Confirm Appointment'} <CheckCircle2Icon className='ml-2 size-4' />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PatientAppointmentForm;
