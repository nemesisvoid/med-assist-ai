import type { Metadata } from 'next';
import Link from 'next/link';
import { ScrollTextIcon, ShieldCheckIcon } from 'lucide-react';

import { describeUserAgent, EmptyState, formatDateTime, PageHeader, RoleBadge } from '@/components/admin/admin-ui';
import { AUDIT_ACTION_META, getAuditMeta, AuditActionBadge } from '@/components/admin/audit-meta';
import { ClearFilters, FilterBar, SearchFilter, SelectFilter } from '@/components/admin/admin-filters';
import Pagination from '@/components/admin/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listAuditLogs } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import type { AuditAction } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Audit log' };

const ACTIONS = Object.keys(AUDIT_ACTION_META) as AuditAction[];

const AuditLogPage = async ({ searchParams }: { searchParams: Promise<{ q?: string; action?: string; page?: string }> }) => {
  await requireAdminPage();
  const params = await searchParams;
  const action = ACTIONS.includes(params.action as AuditAction) ? (params.action as AuditAction) : undefined;
  const result = await listAuditLogs({ q: params.q, action, page: Number(params.page) });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Audit log'
        description='An append-only record of sign-ins, account changes, administrative actions and patient-record access. Entries never contain clinical content.'
      />

      <div className='flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900'>
        <ShieldCheckIcon
          className='mt-0.5 size-4 shrink-0 text-blue-600'
          aria-hidden
        />
        <p>
          Supports HIPAA audit-control requirements (45 CFR §164.312(b)). Use it to investigate who accessed a patient record, when an account was changed,
          and from which device.
        </p>
      </div>

      <section className='overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm'>
        <FilterBar>
          <SearchFilter placeholder='Search by person, summary or record ID…' />
          <SelectFilter
            param='action'
            label='Event'
            options={ACTIONS.map(a => ({ value: a, label: getAuditMeta(a).label }))}
          />
          <ClearFilters params={['q', 'action']} />
        </FilterBar>

        {result.items.length === 0 ? (
          <EmptyState
            icon={<ScrollTextIcon className='size-5' />}
            title='No events found'
            description='Events appear here as people sign in and administrators make changes.'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Performed by</TableHead>
                <TableHead className='hidden lg:table-cell'>Details</TableHead>
                <TableHead className='hidden xl:table-cell'>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map(event => (
                <TableRow key={event.id}>
                  <TableCell className='whitespace-nowrap text-xs text-slate-600'>
                    <time dateTime={event.createdAt.toISOString()}>{formatDateTime(event.createdAt)}</time>
                  </TableCell>
                  <TableCell>
                    <AuditActionBadge action={event.action} />
                  </TableCell>
                  <TableCell>
                    {event.actor ? (
                      <div className='flex flex-wrap items-center gap-2'>
                        <Link
                          href={`/admin/users/${event.actor.id}`}
                          className='max-w-44 truncate text-sm font-semibold text-slate-800 hover:text-blue-600'>
                          {event.actor.name}
                        </Link>
                        <RoleBadge role={event.actor.role} />
                      </div>
                    ) : (
                      <span className='text-sm text-slate-500'>System / deleted user</span>
                    )}
                  </TableCell>
                  <TableCell className='hidden max-w-sm lg:table-cell'>
                    <p className='truncate text-sm text-slate-700'>{event.summary}</p>
                    {event.entityId && (
                      <p className='truncate font-mono text-[11px] text-slate-400'>
                        {event.entityType} · {event.entityId}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className='hidden text-xs text-slate-500 xl:table-cell'>
                    {event.ipAddress || event.userAgent ? (
                      <>
                        <span className='block'>{describeUserAgent(event.userAgent)}</span>
                        <span
                          className='block max-w-40 truncate font-mono text-[11px] text-slate-400'
                          title={event.ipAddress ?? undefined}>
                          {event.ipAddress ?? '—'}
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination
          pathname='/admin/audit-logs'
          searchParams={params}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          noun='events'
        />
      </section>
    </div>
  );
};

export default AuditLogPage;
