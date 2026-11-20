import { cn } from '@/lib/utils';

export const settingsLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
export const settingsInputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm aria-invalid:border-red-500';

/** A titled card used by the profile and account settings pages. */
export default function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm', className)}>
      <header className='flex items-start gap-2.5 border-b border-slate-100 px-5 py-4'>
        <span className='mt-0.5 text-slate-400' aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className='text-sm font-bold text-slate-800'>{title}</h2>
          <p className='mt-0.5 text-xs text-slate-500'>{description}</p>
        </div>
      </header>
      <div className='grid content-start gap-4 p-5'>{children}</div>
    </section>
  );
}
