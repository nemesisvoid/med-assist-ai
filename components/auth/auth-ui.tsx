'use client';

import { forwardRef, useState } from 'react';
import { AlertCircleIcon, ArrowRight, CheckCircle2Icon, EyeIcon, EyeOffIcon, LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const authLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm';

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(({ invalid, className, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(inputClass, invalid ? 'border-red-500' : 'border-slate-200', className)}
    {...props}
  />
));
AuthInput.displayName = 'AuthInput';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<AuthInputProps, 'type'>>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className='relative'>
      <AuthInput
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type='button'
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className='absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500'>
        {visible ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export const AuthSubmitButton = ({ pending, children }: { pending: boolean; children: React.ReactNode }) => (
  <button
    disabled={pending}
    aria-busy={pending}
    type='submit'
    className='mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70'>
    {children}
    {pending ? (
      <LoaderIcon
        className='size-4 animate-spin'
        aria-hidden
      />
    ) : (
      <ArrowRight
        size={16}
        aria-hidden
      />
    )}
  </button>
);

export const FormAlert = ({ variant, children }: { variant: 'error' | 'success'; children: React.ReactNode }) => {
  const Icon = variant === 'error' ? AlertCircleIcon : CheckCircle2Icon;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3 text-[13px] leading-relaxed',
        variant === 'error' ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800',
      )}>
      <Icon
        className='mt-0.5 size-4 shrink-0'
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
};

/** Lightweight strength meter: length + character variety. Purely advisory. */
export function getPasswordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

export const PasswordStrength = ({ password }: { password: string }) => {
  const { score, label } = getPasswordStrength(password);
  if (!password) return null;
  const colors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  return (
    <div
      className='mt-2'
      aria-live='polite'>
      <div className='flex gap-1'>
        {[1, 2, 3, 4].map(step => (
          <span
            key={step}
            className={cn('h-1 flex-1 rounded-full transition-colors', score >= step ? colors[score] : 'bg-slate-200')}
          />
        ))}
      </div>
      <p className='mt-1 text-[11px] font-medium text-slate-500'>Password strength: {label}</p>
    </div>
  );
};
