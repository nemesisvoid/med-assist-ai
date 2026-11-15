import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Short supporting line, e.g. "12 new in the last 30 days". */
  hint?: string;
  /** Percentage change vs. the previous period. */
  change?: number | null;
  accent?: 'blue' | 'teal' | 'violet' | 'amber';
};

const accents = {
  blue: 'bg-blue-50 text-blue-600',
  teal: 'bg-teal-50 text-teal-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
};

const KpiCard = ({ label, value, icon, hint, change, accent = 'blue' }: KpiCardProps) => {
  const trend = change == null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const TrendIcon = trend === 'up' ? ArrowUpRightIcon : trend === 'down' ? ArrowDownRightIcon : MinusIcon;

  return (
    <div className='rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5'>
      <div className='flex items-start justify-between gap-3'>
        <p className='text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs'>{label}</p>
        <span className={cn('hidden size-9 shrink-0 sm:flex items-center justify-center rounded-xl', accents[accent])}>{icon}</span>
      </div>
      <p className='mt-2 text-2xl font-extrabold sm:text-3xl tracking-tight text-slate-900 tabular-nums'>{value}</p>
      <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold tabular-nums',
              trend === 'up' && 'bg-emerald-50 text-emerald-700',
              trend === 'down' && 'bg-rose-50 text-rose-700',
              trend === 'flat' && 'bg-slate-100 text-slate-600',
            )}>
            <TrendIcon
              className='size-3'
              aria-hidden
            />
            <span className='sr-only'>{trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'No change'}</span>
            {Math.abs(change!)}%
          </span>
        )}
        {hint && <span className='text-slate-500'>{hint}</span>}
      </div>
    </div>
  );
};

export default KpiCard;
