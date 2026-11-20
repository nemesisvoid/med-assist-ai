'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CheckIcon, KeyRoundIcon, LoaderIcon } from 'lucide-react';
import { toast } from 'sonner';

import { changeMyPassword } from '@/actions/account.action';
import { ChangePasswordSchema, PASSWORD_MIN_LENGTH } from '@/validations/account';
import Section, { settingsInputClass, settingsLabelClass } from '@/components/shared/settings-section';
import { cn } from '@/lib/utils';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** "Password" card for the profile pages (patients and clinicians). */
export default function ChangePasswordForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [values, setValues] = useState(EMPTY);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hasPassword) {
    return (
      <Section title='Password' description='How you sign in.' icon={<KeyRoundIcon className='size-4' />}>
        <p className='rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600'>
          You sign in with Google, so there’s no password to change here. Manage your password in your Google account.
        </p>
      </Section>
    );
  }

  const set = (field: Field, value: string) => {
    setValues(v => ({ ...v, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
    setFormError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ChangePasswordSchema.safeParse({ ...values, revokeOtherSessions });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const res = await changeMyPassword(parsed.data);
      if (!res.success) {
        if (res.field) setErrors({ [res.field]: res.message });
        else setFormError(res.message);
        return;
      }
      setValues(EMPTY);
      setErrors({});
      toast.success(res.message);
    });
  };

  const longEnough = values.newPassword.length >= PASSWORD_MIN_LENGTH;
  const matches = values.newPassword.length > 0 && values.newPassword === values.confirmPassword;

  const input = (field: Field, label: string, autoComplete: string, hint?: React.ReactNode) => (
    <div>
      <label htmlFor={`password-${field}`} className={settingsLabelClass}>
        {label}
      </label>
      <input
        id={`password-${field}`}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={values[field]}
        onChange={e => set(field, e.target.value)}
        aria-invalid={!!errors[field] || undefined}
        aria-describedby={errors[field] ? `password-${field}-error` : undefined}
        maxLength={128}
        className={settingsInputClass}
      />
      {errors[field] ? (
        <p id={`password-${field}-error`} className='mt-1 text-xs font-medium text-red-600'>
          {errors[field]}
        </p>
      ) : (
        hint
      )}
    </div>
  );

  return (
    <Section title='Password' description='Change the password you use to sign in.' icon={<KeyRoundIcon className='size-4' />}>
      <form onSubmit={submit} className='grid gap-4' noValidate>
        {/* Lets password managers associate the new password with this account. */}
        <input type='email' name='username' autoComplete='username' value={email} readOnly hidden />

        <div className='grid gap-4 md:grid-cols-3'>
          {input(
            'currentPassword',
            'Current password',
            'current-password',
            <Link href='/auth/forgot-password' className='mt-1 inline-block text-xs font-medium text-blue-600 hover:underline'>
              Forgot it?
            </Link>,
          )}
          {input(
            'newPassword',
            'New password',
            'new-password',
            <p className={cn('mt-1 flex items-center gap-1 text-xs', longEnough ? 'text-emerald-700' : 'text-slate-500')}>
              <CheckIcon className={cn('size-3', !longEnough && 'opacity-30')} aria-hidden />
              At least {PASSWORD_MIN_LENGTH} characters
            </p>,
          )}
          {input(
            'confirmPassword',
            'Confirm new password',
            'new-password',
            values.confirmPassword ? (
              <p className={cn('mt-1 flex items-center gap-1 text-xs', matches ? 'text-emerald-700' : 'text-slate-500')}>
                <CheckIcon className={cn('size-3', !matches && 'opacity-30')} aria-hidden />
                {matches ? 'Passwords match' : 'Passwords don’t match yet'}
              </p>
            ) : undefined,
          )}
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6'>
          <label className='flex cursor-pointer items-center gap-2 text-sm text-slate-700'>
            <input type='checkbox' checked={show} onChange={e => setShow(e.target.checked)} className='size-4 accent-blue-600' />
            Show passwords
          </label>
          <label className='flex cursor-pointer items-center gap-2 text-sm text-slate-700'>
            <input
              type='checkbox'
              checked={revokeOtherSessions}
              onChange={e => setRevokeOtherSessions(e.target.checked)}
              className='size-4 accent-blue-600'
            />
            Sign out of other devices
          </label>
        </div>

        {formError && (
          <p role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {formError}
          </p>
        )}

        <div>
          <button
            type='submit'
            disabled={isPending}
            className='inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60'>
            {isPending && <LoaderIcon className='size-4 animate-spin' aria-hidden />}
            {isPending ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </Section>
  );
}
