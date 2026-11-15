'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeftIcon, KeyRoundIcon, MailCheckIcon } from 'lucide-react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ForgotPasswordSchema } from '@/validations/validation';
import { authClient, getAuthErrorMessage } from '@/lib/auth.client';
import { AuthInput, AuthSubmitButton, FormAlert, authLabelClass } from './auth-ui';

const ForgotPasswordForm = () => {
  const [isPending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = ({ email }: z.infer<typeof ForgotPasswordSchema>) => {
    setFormError(undefined);
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/auth/reset-password' });
      // Rate limiting is the only error worth surfacing; otherwise always show the same
      // confirmation so the form can't be used to discover which emails have accounts.
      if (error?.status === 429) {
        setFormError(getAuthErrorMessage(error));
        return;
      }
      setSentTo(email);
    });
  };

  if (sentTo) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600'>
          <MailCheckIcon
            className='size-6'
            aria-hidden
          />
        </div>
        <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>Check your email</h1>
        <p className='text-[13.5px] leading-relaxed text-slate-500'>
          If an account exists for <span className='break-all font-semibold text-slate-800'>{sentTo}</span>, you&apos;ll receive a link to reset your
          password. The link expires in 1 hour.
        </p>
        <Link
          href='/auth/login'
          className='mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700'>
          Back to sign in
        </Link>
        <button
          type='button'
          onClick={() => setSentTo(null)}
          className='mt-3 w-full cursor-pointer py-2 text-[13px] font-bold text-blue-600 hover:underline'>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <Link
        href='/auth/login'
        className='mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-800'>
        <ArrowLeftIcon
          className='size-4'
          aria-hidden
        />
        Back to sign in
      </Link>

      <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
        <KeyRoundIcon
          className='size-6'
          aria-hidden
        />
      </div>
      <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>Forgot your password?</h1>
      <p className='mb-6 text-[13.5px] text-slate-500'>Enter the email you use for MedAssist and we&apos;ll send you a secure reset link.</p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-col gap-4'>
        <Controller
          name='email'
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel
                htmlFor='email'
                className={authLabelClass}>
                Email Address
              </FieldLabel>
              <AuthInput
                {...field}
                id='email'
                type='email'
                inputMode='email'
                autoComplete='email'
                autoFocus
                placeholder='johndoe@gmail.com'
                invalid={!!errors.email}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
          )}
        />

        {formError && <FormAlert variant='error'>{formError}</FormAlert>}

        <AuthSubmitButton pending={isPending}>Send reset link</AuthSubmitButton>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
