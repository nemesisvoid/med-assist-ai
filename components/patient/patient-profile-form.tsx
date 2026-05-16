'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoaderIcon, UserPlus } from 'lucide-react';

import { PatientProfileFormSchema } from '@/validations/validation';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createPatientProfile } from '@/actions/patient.action';
import { toast } from 'sonner';
import { generateMedicalRecordNumber } from '@/lib/utils';

const PatientProfileForm = ({ userId }: { userId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof PatientProfileFormSchema>>({
    resolver: zodResolver(PatientProfileFormSchema),
    defaultValues: {
      // dateOfBirth: '',
      gender: undefined,
      genotype: '',
      bloodGroup: '',
      allergies: '',
      medications: '',
      medicalHistory: '',
      emergencyContact: '',
      insuranceProvider: '',
    },
  });

  const onSubmit = (data: z.infer<typeof PatientProfileFormSchema>) => {
    startTransition(async () => {
      try {
        console.log('Submitted Profile Data:', data);
        const res = await createPatientProfile(userId, data);
        if (!res.success) {
          toast.error(res.message);
          return;
        }

        toast.success(res.message);

        setIsOpen(false);
        reset();
      } catch (error) {
        console.error('An error occurred while saving the profile:', error);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}>
      <DialogTrigger>
        <p className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/10'>
          <UserPlus size={18} />
          Create Medical Profile
        </p>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-6'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold text-slate-900'>Patient Form</DialogTitle>
          <DialogDescription className='text-slate-500 text-xs'>
            Please complete your vital medical credentials. Your information is confidential and fully protected.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, errors => console.log(errors))}
          className='mt-4 flex flex-col gap-4'>
          {/* Row 1: DOB & Gender */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Controller
              name='dateOfBirth'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Date of Birth
                  </FieldLabel>
                  <input
                    type='date'
                    id={field.name}
                    {...field}
                    value={field.value ?? ''}
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.dateOfBirth ? 'border-red-500' : 'border-slate-200'}`}
                  />
                  <FieldError />
                </Field>
              )}
            />

            <Controller
              name='gender'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Gender
                  </FieldLabel>
                  <select
                    id={field.name}
                    {...field}
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.gender ? 'border-red-500' : 'border-slate-200'}`}>
                    <option value=''>Select gender</option>
                    <option value='MALE'>Male</option>
                    <option value='FEMALE'>Female</option>
                  </select>
                  <FieldError />
                </Field>
              )}
            />
          </div>

          {/* Row 2: Genotype & Blood Group */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Controller
              name='genotype'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Genotype
                  </FieldLabel>
                  <input
                    id={field.name}
                    {...field}
                    placeholder='e.g. AA, AS'
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.genotype ? 'border-red-500' : 'border-slate-200'}`}
                  />
                  <FieldError />
                </Field>
              )}
            />

            <Controller
              name='bloodGroup'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Blood Group
                  </FieldLabel>
                  <input
                    id={field.name}
                    {...field}
                    placeholder='e.g. O+, A-'
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.bloodGroup ? 'border-red-500' : 'border-slate-200'}`}
                  />
                  <FieldError />
                </Field>
              )}
            />
          </div>

          {/* Row 3: Emergency Contact & Insurance */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Controller
              name='emergencyContact'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Emergency Contact
                  </FieldLabel>
                  <input
                    id={field.name}
                    {...field}
                    value={field.value ?? ''}
                    placeholder='Name & Phone number'
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.emergencyContact ? 'border-red-500' : 'border-slate-200'}`}
                  />
                  <FieldError />
                </Field>
              )}
            />

            <Controller
              name='insuranceProvider'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={field.name}
                    className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                    Insurance Provider
                  </FieldLabel>
                  <input
                    id={field.name}
                    {...field}
                    value={field.value ?? ''}
                    placeholder='e.g. Blue Cross'
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.insuranceProvider ? 'border-red-500' : 'border-slate-200'}`}
                  />
                  <FieldError />
                </Field>
              )}
            />
          </div>

          {/* Textarea 1: Allergies */}
          <Controller
            name='allergies'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Allergies
                </FieldLabel>
                <textarea
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  rows={2}
                  placeholder='List any food, drug, or environmental allergies (or "None")'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${errors.allergies ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Textarea 2: Current Medications */}
          <Controller
            name='medications'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Current Medications
                </FieldLabel>
                <textarea
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  rows={2}
                  placeholder='List any prescriptions or supplements you are taking'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${errors.medications ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

          {/* Textarea 3: Medical History */}
          <Controller
            name='medicalHistory'
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel
                  htmlFor={field.name}
                  className='text-[10px] font-bold text-slate-500 block mb-1 tracking-wider uppercase'>
                  Past Medical History
                </FieldLabel>
                <textarea
                  id={field.name}
                  {...field}
                  value={field.value ?? ''}
                  rows={2}
                  placeholder='Prior surgeries, chronic conditions, or ongoing treatments'
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none ${errors.medicalHistory ? 'border-red-500' : 'border-slate-200'}`}
                />
                <FieldError />
              </Field>
            )}
          />

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
                Saving Medical Record...
              </>
            ) : (
              'Save Profile and Continue'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientProfileForm;
