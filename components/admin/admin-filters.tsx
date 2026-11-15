'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderIcon, SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Writes filter changes to the URL (so views are shareable) and resets pagination. */
function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return { update, isPending, searchParams };
}

export const FilterBar = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    role='search'
    className={cn('flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-center', className)}>
    {children}
  </div>
);

export const SearchFilter = ({ placeholder, param = 'q', label = 'Search' }: { placeholder: string; param?: string; label?: string }) => {
  const { update, isPending, searchParams } = useUpdateParams();
  const initial = searchParams.get(param) ?? '';
  const [value, setValue] = useState(initial);
  const lastCommitted = useRef(initial);

  // Debounce typing so we don't navigate on every keystroke.
  useEffect(() => {
    if (value === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = value;
      update(param, value.trim() || null);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className='relative min-w-0 flex-1 sm:min-w-64'>
      <label
        htmlFor={`filter-${param}`}
        className='sr-only'>
        {label}
      </label>
      <SearchIcon
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400'
        aria-hidden
      />
      <input
        id={`filter-${param}`}
        type='search'
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className='h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden'
      />
      {isPending ? (
        <LoaderIcon
          className='absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400'
          aria-label='Loading results'
        />
      ) : (
        value && (
          <button
            type='button'
            onClick={() => setValue('')}
            aria-label='Clear search'
            className='absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700'>
            <XIcon className='size-3.5' />
          </button>
        )
      )}
    </div>
  );
};

export const SelectFilter = ({ param, label, options }: { param: string; label: string; options: { value: string; label: string }[] }) => {
  const { update, searchParams } = useUpdateParams();
  const value = searchParams.get(param) ?? '';

  return (
    <div className='flex items-center'>
      <label
        htmlFor={`filter-${param}`}
        className='sr-only'>
        {label}
      </label>
      <select
        id={`filter-${param}`}
        value={value}
        onChange={e => update(param, e.target.value || null)}
        className={cn(
          'h-10 w-full cursor-pointer rounded-lg border bg-white px-3 pr-8 text-base outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-auto sm:text-sm',
          value ? 'border-blue-200 bg-blue-50/50 font-semibold text-blue-700' : 'border-slate-200 text-slate-700',
        )}>
        <option value=''>{label}: All</option>
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const ClearFilters = ({ params }: { params: string[] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = params.some(p => searchParams.get(p));
  if (!active) return null;
  return (
    <button
      type='button'
      onClick={() => router.replace(pathname, { scroll: false })}
      className='h-10 cursor-pointer rounded-lg px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'>
      Clear filters
    </button>
  );
};
