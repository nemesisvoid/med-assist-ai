'use client';

import { WEEKDAYS, WEEKDAY_LABELS, formatDayHours, type OpeningHours, type Weekday } from '@/lib/clinic-hours';
import { cn } from '@/lib/utils';

const inputClass =
  'w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-base text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm';

/**
 * Editable weekly hours (one row per day with an "open" checkbox and times).
 * `reference` optionally shows another schedule alongside (e.g. the clinic's hours).
 */
export default function WeeklyHoursEditor({
  value,
  onChange,
  errors = {},
  reference,
  referenceLabel = 'Clinic',
  idPrefix = 'hours',
}: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
  errors?: Record<string, string>;
  reference?: OpeningHours;
  referenceLabel?: string;
  idPrefix?: string;
}) {
  const setDay = (day: Weekday, hours: OpeningHours[Weekday]) => onChange({ ...value, [day]: hours });

  return (
    <ul className='divide-y divide-slate-100 rounded-xl border border-slate-200'>
      {WEEKDAYS.map(day => {
        const hours = value[day];
        const error = errors[`${day}`];
        return (
          <li key={day} className='flex flex-wrap items-center gap-3 px-4 py-3'>
            <label className='flex w-36 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800'>
              <input
                id={`${idPrefix}-${day}`}
                type='checkbox'
                checked={!!hours}
                onChange={e => setDay(day, e.target.checked ? (reference?.[day] ?? { open: '09:00', close: '17:00' }) : null)}
                className='size-4 accent-blue-600'
              />
              {WEEKDAY_LABELS[day]}
            </label>
            {hours ? (
              <div className='flex items-center gap-2 text-sm text-slate-600'>
                <input
                  type='time'
                  aria-label={`${WEEKDAY_LABELS[day]} start time`}
                  value={hours.open}
                  onChange={e => setDay(day, { ...hours, open: e.target.value })}
                  className={inputClass}
                />
                <span aria-hidden>to</span>
                <input
                  type='time'
                  aria-label={`${WEEKDAY_LABELS[day]} end time`}
                  value={hours.close}
                  onChange={e => setDay(day, { ...hours, close: e.target.value })}
                  className={inputClass}
                />
              </div>
            ) : (
              <span className='text-sm text-slate-400'>Not working</span>
            )}
            {reference && (
              <span className={cn('ml-auto text-xs', reference[day] ? 'text-slate-400' : 'text-amber-600')}>
                {referenceLabel}: {formatDayHours(reference[day])}
              </span>
            )}
            {error && <p className='w-full text-xs font-medium text-red-600'>{error}</p>}
          </li>
        );
      })}
    </ul>
  );
}
