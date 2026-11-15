import type { Metadata } from 'next';
import Link from 'next/link';
import { LinkIcon } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import ResetPasswordForm from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password · MedAssist AI',
};

type SearchParams = Promise<{ token?: string; error?: string; invite?: string }>;

const ResetPasswordPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { token, error, invite } = await searchParams;

  return (
    <AuthShell>
      {token && !error ? (
        <ResetPasswordForm
          token={token}
          isInvite={invite === '1'}
        />
      ) : (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600'>
            <LinkIcon
              className='size-6'
              aria-hidden
            />
          </div>
          <h1 className='mb-1 text-[22px] font-extrabold tracking-tight text-slate-900'>This link has expired</h1>
          <p className='text-[13.5px] leading-relaxed text-slate-500'>
            Password reset links can only be used once and expire after 1 hour. Request a new link to continue.
          </p>
          <Link
            href='/auth/forgot-password'
            className='mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700'>
            Request a new link
          </Link>
          <Link
            href='/auth/login'
            className='mt-3 block w-full py-2 text-center text-[13px] font-bold text-blue-600 hover:underline'>
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
};

export default ResetPasswordPage;
