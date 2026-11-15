'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

type TrendPoint = { date: string; scheduled: number; completed: number };
type Range = '7d' | '30d' | '90d';

// Categorical pair validated for contrast and colour-vision deficiency separation.
const chartConfig = {
  scheduled: { label: 'Scheduled', color: '#2563eb' },
  completed: { label: 'Completed', color: '#0d9488' },
} satisfies ChartConfig;

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const AppointmentsTrendChart = ({ data, range }: { data: TrendPoint[]; range: Range }) => {
  const totals = data.reduce((acc, d) => ({ scheduled: acc.scheduled + d.scheduled, completed: acc.completed + d.completed }), { scheduled: 0, completed: 0 });
  const tickFormat = range === '7d' ? 'EEE' : 'MMM d';

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-wrap items-center justify-between gap-3 px-5 pt-4'>
        <ul
          className='flex flex-wrap items-center gap-4'
          aria-label='Legend'>
          {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map(key => (
            <li
              key={key}
              className='flex items-center gap-2 text-xs text-slate-600'>
              <span
                aria-hidden
                className='h-0.5 w-4 rounded-full'
                style={{ backgroundColor: chartConfig[key].color }}
              />
              {chartConfig[key].label}
              <span className='font-bold tabular-nums text-slate-900'>{totals[key]}</span>
            </li>
          ))}
        </ul>

        <nav
          aria-label='Time range'
          className='flex rounded-lg border border-slate-200 bg-slate-50 p-0.5'>
          {RANGES.map(r => (
            <Link
              key={r.value}
              href={`?range=${r.value}`}
              scroll={false}
              aria-current={r.value === range ? 'true' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                r.value === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}>
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <ChartContainer
        config={chartConfig}
        className='aspect-auto h-72 w-full px-2 pb-2 pt-4'>
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke='#eef2f6'
          />
          <XAxis
            dataKey='date'
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
            tickFormatter={value => format(parseISO(value), tickFormat)}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <ChartTooltip
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            content={<ChartTooltipContent labelFormatter={value => format(parseISO(String(value)), 'EEE, MMM d')} />}
          />
          <Line
            dataKey='scheduled'
            type='monotone'
            stroke='var(--color-scheduled)'
            strokeWidth={2}
            dot={false}
            animationDuration={500}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
          <Line
            dataKey='completed'
            type='monotone'
            stroke='var(--color-completed)'
            strokeWidth={2}
            dot={false}
            animationDuration={500}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ChartContainer>

      <details className='border-t border-slate-100 px-5 py-3 text-xs text-slate-500'>
        <summary className='cursor-pointer font-semibold text-slate-600 hover:text-slate-900'>View as table</summary>
        <div className='mt-3 max-h-56 overflow-y-auto'>
          <table className='w-full text-left tabular-nums'>
            <thead>
              <tr className='text-slate-500'>
                <th
                  scope='col'
                  className='py-1 font-semibold'>
                  Date
                </th>
                <th
                  scope='col'
                  className='py-1 text-right font-semibold'>
                  Scheduled
                </th>
                <th
                  scope='col'
                  className='py-1 text-right font-semibold'>
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr
                  key={row.date}
                  className='border-t border-slate-50 text-slate-700'>
                  <td className='py-1'>{format(parseISO(row.date), 'EEE, MMM d')}</td>
                  <td className='py-1 text-right'>{row.scheduled}</td>
                  <td className='py-1 text-right'>{row.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default AppointmentsTrendChart;
