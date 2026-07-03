'use client';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

import { ArrowRight, LoaderIcon, Shield } from 'lucide-react';
import { Field, FieldError, FieldLabel } from './ui/field';
import { AuthSchema, LoginFormSchema } from '@/validations/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth.client';
import { useRouter } from 'next/navigation';

const AuthForm = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>('');

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    resolver: zodResolver(AuthSchema),
    defaultValues: {
      mode: 'login',
      email: '',
      password: '',
    },
  });

  const toggleMode = newMode => {
    setMode(newMode);

    reset({
      mode: newMode,
      email: '',
      password: '',
      ...(newMode === 'create' ? { name: '' } : {}),
    });
  };

  const onSubmit = async (data: z.infer<typeof AuthSchema>) => {
    startTransition(async () => {
      try {
        if (data.mode === 'login') {
          const { data: authData, error } = await authClient.signIn.email({
            email: data.email,
            password: data.password,
          });
          if (error) {
            setFormError('Invalid email or password');
            return;
          } else if (data) {
            router.push('/patient/dashboard');
            setFormError('');
          }
        } else if (data.mode === 'create') {
          const { data: authData, error } = await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
            callbackURL: '/patient/dashboard',
          });
          if (error) {
            setFormError(error.message);
            reset();
            return;
          } else if (data) {
            router.push('/patient/dashboard');
            setFormError('');
          }
        }
      } catch (err) {
        console.log('an error occurred', err);
      }
    });
  };

  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center px-10 py-8 overflow-y-auto'>
      <div className='w-full max-w-95'>
        {/* Toggle Switch */}
        <div className='bg-white rounded-xl p-1 flex mb-7 border border-slate-200 shadow-sm'>
          {[
            { id: 'login', label: 'Sign In' },
            { id: 'create', label: 'Create Account' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => toggleMode(item.id)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                mode === item.id ? 'bg-slate-50 text-slate-900 shadow-sm font-bold border border-slate-100' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <h2 className='text-[22px] font-extrabold text-slate-900 mb-1 tracking-tight'>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className='text-[13.5px] text-slate-500 mb-6'>
          {mode === 'login' ? 'Sign in to your patient portal' : 'Join thousands of patients using AI-powered care'}
        </p>

        {/* Form */}

        {/* CREATE ACCOUNT FORM */}

        <form
          onSubmit={handleSubmit(onSubmit, err => {
            console.log(err);
          })}
          className='flex flex-col gap-4'>
          {mode === 'create' && (
            <div>
              <Controller
                name='name'
                control={control}
                render={({ field }) => {
                  const nameError = (errors as { name?: { message?: string } }).name;
                  return (
                    <Field>
                      <FieldLabel
                        htmlFor={field.name}
                        className='text-[11px] font-bold text-slate-500 block mb-1.5 tracking-wider uppercase'>
                        Full Name
                      </FieldLabel>
                      <input
                        id={field.name}
                        {...field}
                        placeholder='e.g. John Doe'
                        className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${nameError ? 'border-red-500' : 'border-slate-200'}`}
                      />
                      {nameError && <FieldError>{nameError.message}</FieldError>}
                    </Field>
                  );
                }}
              />
            </div>
          )}

          <div>
            <Controller
              name='email'
              control={control}
              render={({ field }) => {
                return (
                  <Field>
                    <FieldLabel
                      htmlFor={field.name}
                      className='text-[11px] font-bold text-slate-500 block mb-1.5 tracking-wider uppercase'>
                      Email Address
                    </FieldLabel>
                    <input
                      {...field}
                      id={field.name}
                      placeholder='johndoe@gmail.com'
                      className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
                    />
                    {errors.email && <FieldError>{errors?.email.message}</FieldError>}
                  </Field>
                );
              }}
            />
          </div>

          <div>
            <Controller
              name='password'
              control={control}
              render={({ field }) => {
                return (
                  <Field>
                    <FieldLabel
                      htmlFor={field.name}
                      className='text-[11px] font-bold text-slate-500 block mb-1.5 tracking-wider uppercase'>
                      Password
                    </FieldLabel>

                    <input
                      {...field}
                      id={field.name}
                      placeholder='*************'
                      type='password'
                      className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.password ? 'border-red-500' : 'border-slate-200'}`}
                    />
                    {/* {mode === 'login' && (
                      <button
                        type='button'
                        className='text-[11.5px] text-blue-600 font-semibold hover:underline'>
                        Forgot password?
                      </button>
                    )} */}

                    {errors.password && <FieldError>{errors?.password.message}</FieldError>}
                  </Field>
                );
              }}
            />
          </div>

          {formError && <p className='text-lg font-medium text-red-500 mt-2'>{formError}</p>}
          <button
            disabled={isPending}
            type='submit'
            className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-500/20'>
            {mode === 'login' ? 'Sign In' : 'Create Account'}

            {!isPending && <ArrowRight size={16} />}
            {isPending && <LoaderIcon className='animate-spin' />}
          </button>
        </form>

        {/* Divider */}
        <div className='flex items-center gap-3 my-5'>
          <div className='flex-1 h-px bg-slate-200' />
          <span className='text-xs text-slate-400'>or</span>
          <div className='flex-1 h-px bg-slate-200' />
        </div>

        {/* Social Login */}
        <button className='w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-lg text-[13.5px] font-medium hover:bg-slate-50 transition-colors'>
          <svg
            width='16'
            height='16'
            viewBox='0 0 48 48'>
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
          Continue with Google
        </button>

        {/* Footer Toggle */}
        <p className='text-[13px] text-slate-500 text-center mt-5'>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => toggleMode(mode === 'login' ? 'create' : 'login')}
            className='text-blue-600 font-bold hover:underline'>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>

        {/* Compliance Badge */}
        <div className='mt-6 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2.5 items-start'>
          <Shield
            size={14}
            className='text-emerald-600 shrink-0 mt-0.5'
          />
          <span className='text-[12px] text-emerald-800 leading-relaxed'>
            Your data is encrypted and <strong>HIPAA-compliant</strong>. We never share patient information with third parties.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
