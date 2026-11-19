'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailPlusIcon, RefreshCcwIcon, UserPlusIcon } from 'lucide-react';
import * as z from 'zod';

import { inviteDoctor, resendStaffInvite, updateDoctorAvailability } from '@/actions/admin.action';
import { InviteDoctorSchema } from '@/validations/admin';
import type { DoctorAvailabilityStatus } from '@/generated/prisma/enums';
import { ActionDialog, btnPrimary, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';
import { cn } from '@/lib/utils';

type InviteForm = z.input<typeof InviteDoctorSchema>;

export const InviteDoctorButton = () => {
  const [open, setOpen] = useState(false);
  const { run, isPending } = useAdminAction();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(InviteDoctorSchema),
    defaultValues: { name: '', email: '', providerType: 'DOCTOR', credentials: '', specialty: '', licenseNumber: '' },
  });
  const providerType = watch('providerType');

  const close = () => {
    setOpen(false);
    reset();
  };

  const field = (name: keyof InviteForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label
        htmlFor={`invite-${name}`}
        className={fieldLabelClass}>
        {label}
      </label>
      <input
        id={`invite-${name}`}
        aria-invalid={!!errors[name] || undefined}
        className={fieldInputClass}
        {...props}
        {...register(name)}
      />
      {errors[name] && <p className='mt-1 text-xs font-medium text-red-600'>{errors[name]?.message}</p>}
    </div>
  );

  return (
    <>
      <button
        type='button'
        className={btnPrimary}
        onClick={() => setOpen(true)}>
        <UserPlusIcon
          className='size-4'
          aria-hidden
        />
        Invite clinician
      </button>

      <ActionDialog
        open={open}
        onOpenChange={o => (o ? setOpen(true) : close())}
        title='Invite a clinician'
        description='We’ll create their provider account and email them a secure link to set a password. You never see or handle their credentials.'
        confirmLabel='Send invitation'
        pending={isPending}
        onConfirm={handleSubmit(values => run(() => inviteDoctor(values), close))}>
        <div className='grid gap-4'>
          <fieldset>
            <legend className={fieldLabelClass}>Clinician type</legend>
            <div className='grid grid-cols-2 gap-2'>
              {(
                [
                  ['DOCTOR', 'Doctor', 'Shown as “Dr. Name”'],
                  ['THERAPIST', 'Therapist', 'Shown with credentials, e.g. “Name, LMFT”'],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer flex-col rounded-xl border p-3 transition-colors',
                    providerType === value ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50',
                  )}>
                  <span className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
                    <input
                      type='radio'
                      value={value}
                      className='accent-blue-600'
                      {...register('providerType')}
                    />
                    {label}
                  </span>
                  <span className='mt-0.5 pl-5 text-[11px] text-slate-500'>{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {field('name', 'Full name', { placeholder: 'Amara Okafor', autoComplete: 'off' })}
          {field('email', 'Work email', { type: 'email', placeholder: 'amara.okafor@clinic.org', autoComplete: 'off' })}
          {providerType === 'THERAPIST' && field('credentials', 'Credentials (optional)', { placeholder: 'LMFT, LCSW, PsyD…' })}
          {field('specialty', 'Specialty', { placeholder: providerType === 'THERAPIST' ? 'Anxiety & depression' : 'Family Medicine' })}
          <div className='grid gap-4 sm:grid-cols-2'>
            {field('licenseNumber', 'License no. (optional)', { placeholder: 'MD-20489' })}
            {field('yearsOfExperience', 'Years of experience', { type: 'number', min: 0, max: 70, inputMode: 'numeric', placeholder: '8' })}
          </div>
        </div>
      </ActionDialog>
    </>
  );
};

const AVAILABILITY: { value: DoctorAvailabilityStatus; label: string; dot: string }[] = [
  { value: 'AVAILABLE', label: 'Available', dot: 'bg-emerald-500' },
  { value: 'BUSY', label: 'Busy', dot: 'bg-amber-500' },
  { value: 'OFFLINE', label: 'Offline', dot: 'bg-slate-400' },
  { value: 'ON_LEAVE', label: 'On leave', dot: 'bg-violet-500' },
];

export const AvailabilitySelect = ({ userId, value, doctorName, disabled }: { userId: string; value: DoctorAvailabilityStatus; doctorName: string; disabled?: boolean }) => {
  const [current, setCurrent] = useState(value);
  const { run, isPending } = useAdminAction();
  const dot = AVAILABILITY.find(a => a.value === current)?.dot;

  return (
    <div className='relative inline-flex items-center'>
      <span
        aria-hidden
        className={cn('pointer-events-none absolute left-3 size-2 rounded-full', dot)}
      />
      <select
        aria-label={`Availability for ${doctorName}`}
        value={current}
        disabled={disabled || isPending}
        onChange={e => {
          const next = e.target.value as DoctorAvailabilityStatus;
          const previous = current;
          setCurrent(next);
          run(async () => {
            const result = await updateDoctorAvailability(userId, next);
            if (!result.ok) setCurrent(previous);
            return result;
          });
        }}
        className='h-9 cursor-pointer rounded-lg border border-slate-200 bg-white pl-7 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60'>
        {AVAILABILITY.map(a => (
          <option
            key={a.value}
            value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const ResendInviteButton = ({ userId }: { userId: string }) => {
  const { run, isPending } = useAdminAction();
  return (
    <button
      type='button'
      disabled={isPending}
      onClick={() => run(() => resendStaffInvite(userId))}
      className='inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60'>
      {isPending ? (
        <RefreshCcwIcon
          className='size-3.5 animate-spin'
          aria-hidden
        />
      ) : (
        <MailPlusIcon
          className='size-3.5'
          aria-hidden
        />
      )}
      Resend invite
    </button>
  );
};
