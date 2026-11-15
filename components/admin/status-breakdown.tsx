import Link from 'next/link';
import type { AppointmentStatus } from '@/generated/prisma/enums';
import { formatEnums } from '@/lib/utils';

/**
 * Horizontal bars for appointment counts by status. A single hue encodes magnitude;
 * every bar is labelled with its value, and each row links to the filtered list.
 */
const StatusBreakdown = ({ data }: { data: { status: AppointmentStatus; count: number }[] }) => {
  const max = Math.max(1, ...data.map(d => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ul className='flex flex-col gap-1 p-3'>
      {data.map(({ status, count }) => {
        const share = total ? Math.round((count / total) * 100) : 0;
        return (
          <li key={status}>
            <Link
              href={`/admin/appointments?status=${status}`}
              className='group block rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600'
              aria-label={`${formatEnums(status.toLowerCase())}: ${count} appointments (${share}%)`}>
              <div className='mb-1.5 flex items-baseline justify-between gap-2 text-xs'>
                <span className='font-medium text-slate-600 group-hover:text-slate-900'>{formatEnums(status.toLowerCase())}</span>
                <span className='tabular-nums text-slate-500'>
                  <span className='font-bold text-slate-900'>{count}</span> · {share}%
                </span>
              </div>
              <div className='h-2 w-full overflow-hidden rounded-full bg-slate-100'>
                <div
                  className='h-full rounded-full bg-blue-600 transition-[width] duration-500 motion-reduce:transition-none'
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default StatusBreakdown;
