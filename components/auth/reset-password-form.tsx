'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LockKeyholeIcon } from 'lucide-react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ResetPasswordSchema } from '@/validations/validation';
import { authClient, getAuthErrorMessage } from '@/lib/auth.client';
import { AuthSubmitButton, FormAlert, PasswordInput, PasswordStrength, authLabelClass } from './auth-ui';

type ResetPasswordFormProps = {
  token: string;
  /** Staff invitations reuse the reset flow to let the invitee choose their first password. */
  isInvite?: boolean;
};

const ResetPasswordForm = ({ token, isInvite = false }: ResetPasswordFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = ({ password }: z.infer<typeof ResetPasswordSchema>) => {
    setFormError(undefined);
    startTransition(async () => {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        setFormError(getAuthErrorMessage(error));
        return;
      }
      router.replace('/auth/login?reset=success');
    });
  };

  return (
    <div>
      <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
        <LockKeyholeIcon
          className='size-6'
          aria-hidden
        />
      </div>
      <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>{isInvite ? 'Set up your account' : 'Choose a new password'}</h1>
      <p className='mb-6 text-[13.5px] text-slate-500'>
        {isInvite
          ? 'Create a password to activate your MedAssist account.'
          : 'Your new password must be at least 8 characters. You’ll be signed out of other devices.'}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-col gap-4'>
        <Controller
          name='password'
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel
                htmlFor='password'
                className={authLabelClass}>
                New Password
              </FieldLabel>
              <PasswordInput
                {...field}
                id='password'
                autoComplete='new-password'
                autoFocus
                placeholder='At least 8 characters'
                invalid={!!errors.password}
              />
              <PasswordStrength password={password ?? ''} />
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>
          )}
        />

        <Controller
          name='confirmPassword'
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel
                htmlFor='confirmPassword'
                className={authLabelClass}>
                Confirm Password
              </FieldLabel>
              <PasswordInput
                {...field}
                id='confirmPassword'
                autoComplete='new-password'
                placeholder='Re-enter your password'
                invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
            </Field>
          )}
        />

        {formError && (
          <FormAlert variant='error'>
            {formError}{' '}
            <Link
              href='/auth/forgot-password'
              className='font-bold underline'>
              Request a new link
            </Link>
          </FormAlert>
        )}

        <AuthSubmitButton pending={isPending}>{isInvite ? 'Activate account' : 'Update password'}</AuthSubmitButton>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
