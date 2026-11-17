'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldPlusIcon } from 'lucide-react';
import * as z from 'zod';

import { inviteAdmin } from '@/actions/admin.action';
import { InviteAdminSchema } from '@/validations/admin';
import { ActionDialog, btnSecondary, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';

type InviteForm = z.input<typeof InviteAdminSchema>;

/** Invites a new administrator by email. They set their own password through a single-use link. */
export const InviteAdminButton = () => {
  const [open, setOpen] = useState(false);
  const { run, isPending } = useAdminAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(InviteAdminSchema),
    defaultValues: { name: '', email: '' },
  });

  const close = () => {
    setOpen(false);
    reset();
  };

  const field = (name: keyof InviteForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label
        htmlFor={`invite-admin-${name}`}
        className={fieldLabelClass}>
        {label}
      </label>
      <input
        id={`invite-admin-${name}`}
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
        className={btnSecondary}
        onClick={() => setOpen(true)}>
        <ShieldPlusIcon
          className='size-4'
          aria-hidden
        />
        Invite admin
      </button>

      <ActionDialog
        open={open}
        onOpenChange={o => (o ? setOpen(true) : close())}
        title='Invite an administrator'
        description='They get an email with a single-use link (valid for 1 hour) to set their password. Administrators have full access to accounts, appointments and the audit log.'
        confirmLabel='Send invitation'
        pending={isPending}
        onConfirm={handleSubmit(values => run(() => inviteAdmin(values), close))}>
        <div className='flex flex-col gap-4'>
          {field('name', 'Full name', { autoComplete: 'off', placeholder: 'e.g. Ada Mensah' })}
          {field('email', 'Work email', { type: 'email', autoComplete: 'off', placeholder: 'name@clinic.org' })}
        </div>
      </ActionDialog>
    </>
  );
};
