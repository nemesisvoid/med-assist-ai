'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react';

const AdminError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role='alert'
      className='mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
      <span className='mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600'>
        <AlertTriangleIcon className='size-6' />
      </span>
      <h1 className='text-lg font-bold text-slate-900'>This page couldn’t load</h1>
      <p className='mt-1 text-sm text-slate-500'>Something went wrong while fetching admin data. Try again, and contact engineering if it keeps happening.</p>
      {error.digest && <p className='mt-3 font-mono text-[11px] text-slate-400'>Reference: {error.digest}</p>}
      <button
        type='button'
        onClick={reset}
        className='mt-6 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700'>
        <RotateCcwIcon className='size-4' />
        Try again
      </button>
    </div>
  );
};

export default AdminError;
