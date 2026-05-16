'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ClipboardList, LoaderIcon } from 'lucide-react';

import { PatientInTakeFormSchema } from '@/validations/validation';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createIntakeForm } from '@/actions/patient.action';
import { toast } from 'sonner';

type PatientIntakeFormProps = {
  appointmentId: string;
  onSuccess?: () => void;
};

const PatientIntakeForm = ({ appointmentId, onSuccess }: PatientIntakeFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof PatientInTakeFormSchema>>({
    resolver: zodResolver(PatientInTakeFormSchema),
    defaultValues: {
      appointmentId: appointmentId,
      complaint: '',
      painLevel: '0',
      medication: '',
      currentSymptoms: '',
      allergies: '',
      additionalNotes: '',
    },
  });

  const onSubmit = (data: z.infer<typeof PatientInTakeFormSchema>) => {
    startTransition(async () => {
      try {
        const res = await createIntakeForm(appointmentId, data);
        if (!res?.success) {
          toast.error(res?.message);
          return;
        }
        toast.success(res.message);
        setIsOpen(false);
        reset();
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error('Failed to submit intake form:', error);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}>
      <DialogTrigger>
        <p className='text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm'>
          <ClipboardList size={14} />
          Fill Intake Form
        </p>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-6'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-slate-900'>Pre-Appointment Intake Form</DialogTitle>
          <DialogDescription className='text-slate-500 text-xs'>
            Please outline your current symptoms and condition briefly. This helps your provider prepare ahead of your session.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='mt-4 flex flex-col gap-4'>
          {/* Hidden Appointment ID tracking */}
          <input
            type='hidden'
            value={appointmentId}
          />

          {/* Chief Complaint */}
          <Controller
            name='complaint'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Reason for Visit / Chief Complaint
                </FieldLabel>
                <input
                  id={field.name}
                  {...field}
                  placeholder='e.g. Persistent migraine, annual checkup'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.complaint ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Current Symptoms */}
          <Controller
            name='currentSymptoms'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Current Symptoms
                </FieldLabel>
                <textarea
                  id={field.name}
                  {...field}
                  rows={3}
                  placeholder='Describe what you are currently feeling, when it started, and its severity...'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${errors.currentSymptoms ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Pain Level Slider Field */}
          <Controller
            name='painLevel'
            control={control}
            render={({ field }) => (
              <Field>
                <div className='flex items-center justify-between mb-1.5'>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 tracking-wider uppercase m-0'>
                    Current Pain Level
                  </FieldLabel>
                  <span className='text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 shadow-sm'>
                    {field.value || '0'} / 10
                  </span>
                </div>
                <div className='pt-2 pb-1 px-1 flex items-center gap-3'>
                  <span className='text-[11px] font-semibold text-slate-400'>Mild</span>
                  <input
                    type='range'
                    id={field.name}
                    min='0'
                    max='10'
                    step='1'
                    {...field}
                    value={field.value ?? '0'}
                    className='w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none transition-all'
                  />
                  <span className='text-[11px] font-semibold text-slate-400'>Severe</span>
                </div>
                <FieldError />
              </Field>
            )}
          />

          {/* Medication (Optional) */}
          <Controller
            name='medication'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Current Medications (Optional)
                </FieldLabel>
                <input
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  placeholder='List any current drugs or treatments related to this condition'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.medication ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Allergies (Optional) */}
          <Controller
            name='allergies'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Specific Allergies (Optional)
                </FieldLabel>
                <input
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  placeholder='Any known acute drug or environmental reactions'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.allergies ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Additional Notes (Optional) */}
          <Controller
            name='additionalNotes'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Additional Notes (Optional)
                </FieldLabel>
                <textarea
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  rows={2}
                  placeholder='Anything else your clinical practitioner should keep in mind...'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${errors.additionalNotes ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Form Action Button */}
          <button
            disabled={isPending}
            type='submit'
            className='w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-75'>
            {isPending ? (
              <>
                <LoaderIcon
                  size={16}
                  className='animate-spin'
                />
                Submitting Details...
              </>
            ) : (
              'Submit Intake Details'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientIntakeForm;
