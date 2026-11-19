'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheckIcon, Shield } from 'lucide-react';

import { Field, FieldError, FieldLabel } from './ui/field';
import { AuthSchema, type AuthFormData } from '@/validations/validation';
import { authClient, getAuthErrorMessage } from '@/lib/auth.client';
import { AUTH_CALLBACK_PATH, resolvePostLoginPath } from '@/routes';
import { AuthInput, AuthSubmitButton, FormAlert, PasswordInput, PasswordStrength, authLabelClass } from './auth/auth-ui';

type Mode = 'login' | 'create';

type AuthFormProps = {
  initialMode?: Mode;
  /** Path the user originally requested (validated against their role before use). */
  next?: string;
  googleEnabled?: boolean;
  initialError?: string;
  initialNotice?: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

const callbackWithNext = (next?: string) => (next ? `${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}` : AUTH_CALLBACK_PATH);

const AuthForm = ({ initialMode = 'login', next, googleEnabled = false, initialError, initialNotice }: AuthFormProps) => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [notice, setNotice] = useState<string | undefined>(initialNotice);
  /** Set once an account is created (or sign-in is blocked) and the user must verify their email. */
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<AuthFormData>({
    resolver: zodResolver(AuthSchema),
    defaultValues: { mode: initialMode, email: '', password: '', ...(initialMode === 'create' ? { name: '' } : {}) } as AuthFormData,
  });

  const password = useWatch({ control, name: 'password' });

  const toggleMode = (newMode: Mode) => {
    setMode(newMode);
    setFormError(undefined);
    setNotice(undefined);
    reset({ mode: newMode, email: '', password: '', ...(newMode === 'create' ? { name: '' } : {}) } as AuthFormData);
  };

  const onSubmit = (data: AuthFormData) => {
    setFormError(undefined);
    setNotice(undefined);

    startTransition(async () => {
      if (data.mode === 'login') {
        const { data: authData, error } = await authClient.signIn.email({ email: data.email, password: data.password });

        if (error) {
          if (error.code === 'EMAIL_NOT_VERIFIED') {
            // Better Auth re-sends the verification link on sign-in (emailVerification.sendOnSignIn).
            setPendingVerificationEmail(data.email);
            return;
          }
          setFormError(getAuthErrorMessage(error));
          return;
        }

        router.replace(resolvePostLoginPath(authData?.user.role, next));
        router.refresh();
        return;
      }

      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: callbackWithNext(next),
      });

      if (error) {
        setFormError(getAuthErrorMessage(error));
        return;
      }

      setPendingVerificationEmail(data.email);
    });
  };

  const handleGoogle = async () => {
    setFormError(undefined);
    setIsGooglePending(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: callbackWithNext(next),
      errorCallbackURL: '/auth/login?error=oauth',
    });
    // On success the browser navigates away; only errors land here.
    if (error) {
      setFormError(getAuthErrorMessage(error));
      setIsGooglePending(false);
    }
  };

  if (pendingVerificationEmail) {
    return (
      <VerifyEmailNotice
        email={pendingVerificationEmail}
        callbackURL={callbackWithNext(next)}
        onBack={() => {
          setPendingVerificationEmail(null);
          toggleMode('login');
        }}
      />
    );
  }

  return (
    <div>
      {/* Toggle Switch */}
      <div
        role='tablist'
        aria-label='Authentication mode'
        className='mb-7 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm'>
        {(
          [
            { id: 'login', label: 'Sign In' },
            { id: 'create', label: 'Create Account' },
          ] as const
        ).map(item => (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={mode === item.id}
            onClick={() => toggleMode(item.id)}
            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-[13px] font-medium transition-all duration-150 ${
              mode === item.id ? 'border border-slate-100 bg-slate-50 font-bold text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className='mb-6 text-[13.5px] text-slate-500'>
        {mode === 'login' ? 'Sign in to your MedAssist portal' : 'Join thousands of patients using AI-powered care'}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-col gap-4'>
        {notice && <FormAlert variant='success'>{notice}</FormAlert>}

        {mode === 'create' && (
          <Controller
            name='name'
            control={control}
            render={({ field }) => {
              const nameError = (errors as { name?: { message?: string } }).name;
              return (
                <Field>
                  <FieldLabel
                    htmlFor='name'
                    className={authLabelClass}>
                    Full Name
                  </FieldLabel>
                  <AuthInput
                    id='name'
                    {...field}
                    value={field.value ?? ''}
                    autoComplete='name'
                    placeholder='e.g. John Doe'
                    invalid={!!nameError}
                  />
                  {nameError && <FieldError>{nameError.message}</FieldError>}
                </Field>
              );
            }}
          />
        )}

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
                placeholder='johndoe@gmail.com'
                invalid={!!errors.email}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
          )}
        />

        <Controller
          name='password'
          control={control}
          render={({ field }) => (
            <Field>
              <div className='flex items-center justify-between'>
                <FieldLabel
                  htmlFor='password'
                  className={authLabelClass}>
                  Password
                </FieldLabel>
                {mode === 'login' && (
                  <Link
                    href='/auth/forgot-password'
                    className='mb-1.5 text-[12px] font-semibold text-blue-600 hover:underline'>
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordInput
                {...field}
                id='password'
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                invalid={!!errors.password}
              />
              {mode === 'create' && <PasswordStrength password={password ?? ''} />}
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>
          )}
        />

        {formError && <FormAlert variant='error'>{formError}</FormAlert>}

        <AuthSubmitButton pending={isPending}>{mode === 'login' ? 'Sign In' : 'Create Account'}</AuthSubmitButton>
      </form>

      {googleEnabled && (
        <>
          <div className='my-5 flex items-center gap-3'>
            <div className='h-px flex-1 bg-slate-200' />
            <span className='text-xs text-slate-500'>or</span>
            <div className='h-px flex-1 bg-slate-200' />
          </div>

          <button
            type='button'
            onClick={handleGoogle}
            disabled={isGooglePending}
            className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-[13.5px] font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 48 48'
              aria-hidden>
              <path
                fill='#EA4335'
                d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'
              />
              <path
                fill='#4285F4'
                d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'
              />
              <path
                fill='#FBBC05'
                d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'
              />
              <path
                fill='#34A853'
                d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'
              />
            </svg>
            {isGooglePending ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>
        </>
      )}

      {/* Footer Toggle */}
      <p className='mt-5 text-center text-[13px] text-slate-500'>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type='button'
          onClick={() => toggleMode(mode === 'login' ? 'create' : 'login')}
          className='cursor-pointer font-bold text-blue-600 hover:underline'>
          {mode === 'login' ? 'Sign up free' : 'Sign in'}
        </button>
      </p>

      {mode === 'create' && (
        <p className='mt-3 text-center text-[11.5px] leading-relaxed text-slate-500'>
          Are you a clinician? Provider accounts are created by your organisation&apos;s administrator.
        </p>
      )}

      {/* Compliance Badge */}
      <div className='mt-6 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5'>
        <Shield
          size={14}
          className='mt-0.5 shrink-0 text-emerald-600'
          aria-hidden
        />
        <span className='text-[12px] leading-relaxed text-emerald-800'>
          Your information is encrypted in transit, visible only to your care team, and used only to provide your care. <strong>We never sell your data.</strong>
        </span>
      </div>
    </div>
  );
};

const VerifyEmailNotice = ({ email, callbackURL, onBack }: { email: string; callbackURL: string; onBack: () => void }) => {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ variant: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    setIsSending(true);
    setMessage(null);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL });
    setIsSending(false);
    if (error) {
      setMessage({ variant: 'error', text: getAuthErrorMessage(error) });
      return;
    }
    setMessage({ variant: 'success', text: 'A new verification link is on its way.' });
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
        <MailCheckIcon
          className='size-6'
          aria-hidden
        />
      </div>
      <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>Check your inbox</h1>
      <p className='text-[13.5px] leading-relaxed text-slate-500'>
        We sent a verification link to <span className='font-semibold text-slate-800 break-all'>{email}</span>. Click the link to activate your account
        — it expires in 1 hour.
      </p>

      {message && (
        <div className='mt-4'>
          <FormAlert variant={message.variant}>{message.text}</FormAlert>
        </div>
      )}

      <button
        type='button'
        onClick={resend}
        disabled={cooldown > 0 || isSending}
        className='mt-6 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'>
        {isSending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
      </button>
      <button
        type='button'
        onClick={onBack}
        className='mt-3 w-full cursor-pointer py-2 text-[13px] font-bold text-blue-600 hover:underline'>
        Back to sign in
      </button>
      <p className='mt-4 text-center text-[11.5px] text-slate-500'>Didn&apos;t get it? Check your spam folder or try resending.</p>
    </div>
  );
};

export default AuthForm;
