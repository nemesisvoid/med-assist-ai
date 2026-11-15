import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_PAGE_SIZE } from '@/lib/data/admin';

type PaginationProps = {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  noun: string;
};

const Pagination = ({ pathname, searchParams, page, pageCount, total, noun }: PaginationProps) => {
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (value && key !== 'page') params.set(key, value);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const from = total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const to = Math.min(page * ADMIN_PAGE_SIZE, total);

  const linkClass = 'flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-semibold transition-colors';
  const enabled = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const disabled = 'pointer-events-none border-slate-100 bg-slate-50 text-slate-300';

  return (
    <nav
      aria-label='Pagination'
      className='flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row'>
      <p className='text-xs text-slate-500'>
        Showing <span className='font-semibold text-slate-700'>{from}</span>–<span className='font-semibold text-slate-700'>{to}</span> of{' '}
        <span className='font-semibold text-slate-700'>{total}</span> {noun}
      </p>
      <div className='flex items-center gap-2'>
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 ? disabled : enabled)}>
          <ChevronLeftIcon
            className='size-4'
            aria-hidden
          />
          Previous
        </Link>
        <span className='px-1 text-xs font-medium text-slate-500'>
          Page {page} of {pageCount}
        </span>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          className={cn(linkClass, page >= pageCount ? disabled : enabled)}>
          Next
          <ChevronRightIcon
            className='size-4'
            aria-hidden
          />
        </Link>
      </div>
    </nav>
  );
};

export default Pagination;
