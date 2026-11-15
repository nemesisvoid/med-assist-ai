'use client';

import { useTransition } from 'react';
import { LoaderIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ActionResult } from '@/actions/admin.action';
import { cn } from '@/lib/utils';

export const fieldLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
export const fieldInputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm aria-invalid:border-red-500';

export const btnPrimary =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60';
export const btnDanger =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60';
export const btnSecondary =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60';

/** Runs an admin server action and reports the result as a toast. */
export function useAdminAction() {
  const [isPending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, onSuccess?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  return { run, isPending };
}

type ActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  pending: boolean;
  /** Disable the confirm button (e.g. until required input is valid). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
};

export const ActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  pending,
  confirmDisabled,
  onConfirm,
  children,
}: ActionDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={next => !pending && onOpenChange(next)}>
    <DialogContent className='gap-5 p-6 text-sm sm:max-w-md'>
      <DialogHeader>
        <DialogTitle className='text-base font-bold text-slate-900'>{title}</DialogTitle>
        {description && <DialogDescription className='text-sm leading-relaxed text-slate-500'>{description}</DialogDescription>}
      </DialogHeader>
      <form
        onSubmit={e => {
          e.preventDefault();
          onConfirm();
        }}
        className='flex flex-col gap-5'>
        {children}
        <DialogFooter>
          <button
            type='button'
            className={btnSecondary}
            disabled={pending}
            onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type='submit'
            className={cn(tone === 'danger' ? btnDanger : btnPrimary)}
            disabled={pending || confirmDisabled}
            aria-busy={pending}>
            {pending && (
              <LoaderIcon
                className='size-4 animate-spin'
                aria-hidden
              />
            )}
            {confirmLabel}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
