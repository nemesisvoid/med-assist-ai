import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarIcon, UserRoundSearchIcon } from 'lucide-react';

import { AppointmentStatusBadge, EmptyState, formatDate, PageHeader, PriorityBadge } from '@/components/admin/admin-ui';
import { ClearFilters, FilterBar, SearchFilter, SelectFilter } from '@/components/admin/admin-filters';
import Pagination from '@/components/admin/pagination';
import { AppointmentRowActions } from '@/components/admin/appointment-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAssignableDoctors, listAppointments, OPEN_APPOINTMENT_STATUSES, type AssignmentFilter } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import { formatEnums } from '@/lib/utils';
import type { AppointmentPriority, AppointmentStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Appointments' };

type SearchParams = Promise<{ q?: string; status?: string; priority?: string; assignment?: string; risk?: string; page?: string }>;

const STATUSES: AppointmentStatus[] = [...OPEN_APPOINTMENT_STATUSES, 'COMPLETED', 'CANCELLED'];
const PRIORITIES: AppointmentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const AppointmentsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  await requireAdminPage();
  const params = await searchParams;
  const status = STATUSES.includes(params.status as AppointmentStatus) ? (params.status as AppointmentStatus) : undefined;
  const priority = PRIORITIES.includes(params.priority as AppointmentPriority) ? (params.priority as AppointmentPriority) : undefined;
  const assignment = params.assignment === 'unassigned' || params.assignment === 'assigned' ? (params.assignment as AssignmentFilter) : undefined;

  const [result, doctors] = await Promise.all([
    listAppointments({ q: params.q, status, priority, assignment, risk: params.risk === 'high' ? 'high' : undefined, page: Number(params.page) }),
    getAssignableDoctors(),
  ]);

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Appointments'
        description='Platform-wide appointment oversight. Assign unclaimed visits, rebalance caseloads and cancel when needed. Clinical details stay with the care team.'
      />

      <section className='overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm'>
        <FilterBar>
          <SearchFilter placeholder='Search patient, doctor or visit type…' />
          <SelectFilter
            param='status'
            label='Status'
            options={STATUSES.map(s => ({ value: s, label: formatEnums(s.toLowerCase()) }))}
          />
          <SelectFilter
            param='priority'
            label='Priority'
            options={PRIORITIES.map(p => ({ value: p, label: formatEnums(p.toLowerCase()) }))}
          />
          <SelectFilter
            param='risk'
            label='Risk'
            options={[{ value: 'high', label: 'High risk (open)' }]}
          />
          <SelectFilter
            param='assignment'
            label='Doctor'
            options={[
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'assigned', label: 'Assigned' },
            ]}
          />
          <ClearFilters params={['q', 'status', 'priority', 'assignment', 'risk']} />
        </FilterBar>

        {result.items.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className='size-5' />}
            title='No appointments match these filters'
            description='Try a different search or clear the filters.'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead className='hidden md:table-cell'>Scheduled</TableHead>
                <TableHead className='hidden lg:table-cell'>Visit type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='hidden sm:table-cell'>Priority</TableHead>
                <TableHead className='w-12'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map(a => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${a.patient.id}`}
                      className='block max-w-48 truncate text-sm font-semibold text-slate-800 hover:text-blue-600'>
                      {a.patient.name}
                    </Link>
                    <span className='block max-w-48 truncate text-xs text-slate-500'>{a.patient.email}</span>
                  </TableCell>
                  <TableCell>
                    {a.doctor ? (
                      <>
                        <Link
                          href={`/admin/users/${a.doctor.id}`}
                          className='block max-w-44 truncate text-sm font-medium text-slate-800 hover:text-blue-600'>
                          {a.doctor.name}
                        </Link>
                        <span className='block max-w-44 truncate text-xs text-slate-500'>{a.doctor.doctorProfile?.specialty}</span>
                      </>
                    ) : (
                      <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'>
                        <UserRoundSearchIcon
                          className='size-3'
                          aria-hidden
                        />
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='hidden whitespace-nowrap text-sm text-slate-700 md:table-cell'>
                    {formatDate(a.scheduledAt)}
                    {a.scheduledTime && <span className='block text-xs text-slate-500'>{a.scheduledTime}</span>}
                  </TableCell>
                  <TableCell className='hidden text-sm text-slate-600 lg:table-cell'>{a.appointmentType}</TableCell>
                  <TableCell>
                    <AppointmentStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className='hidden sm:table-cell'>
                    <PriorityBadge priority={a.priority} />
                  </TableCell>
                  <TableCell className='text-right'>
                    <AppointmentRowActions
                      appointmentId={a.id}
                      patientName={a.patient.name}
                      currentDoctorId={a.doctor?.id ?? null}
                      doctors={doctors}
                      isOpen={OPEN_APPOINTMENT_STATUSES.includes(a.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination
          pathname='/admin/appointments'
          searchParams={params}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          noun='appointments'
        />
      </section>
    </div>
  );
};

export default AppointmentsPage;
