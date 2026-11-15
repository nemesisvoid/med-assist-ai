import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BanIcon,
  CalendarCheck2Icon,
  ChevronRightIcon,
  GaugeIcon,
  ScrollTextIcon,
  StethoscopeIcon,
  UserRoundSearchIcon,
  UsersIcon,
} from 'lucide-react';

import KpiCard from '@/components/admin/kpi-card';
import AppointmentsTrendChart from '@/components/admin/appointments-trend-chart';
import StatusBreakdown from '@/components/admin/status-breakdown';
import { AuditActionIcon, AUDIT_ACTION_META } from '@/components/admin/audit-meta';
import { AvailabilityBadge, EmptyState, PageHeader, Panel, PanelLink, UserAvatar } from '@/components/admin/admin-ui';
import { InviteDoctorButton } from '@/components/admin/doctor-actions';
import {
  getAdminOverview,
  getAppointmentStatusBreakdown,
  getAppointmentTrend,
  getDoctorWorkload,
  getRecentAuditEvents,
  type TrendRange,
} from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import { cn, greet } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

const isRange = (value?: string): value is TrendRange => value === '7d' || value === '30d' || value === '90d';

const AdminDashboardPage = async ({ searchParams }: { searchParams: Promise<{ range?: string }> }) => {
  const session = await requireAdminPage();
  const { range: rawRange } = await searchParams;
  const range: TrendRange = isRange(rawRange) ? rawRange : '30d';

  const [overview, trend, breakdown, workload, activity] = await Promise.all([
    getAdminOverview(),
    getAppointmentTrend(range),
    getAppointmentStatusBreakdown(),
    getDoctorWorkload(5),
    getRecentAuditEvents(7),
  ]);

  const attention = [
    {
      label: 'High-risk open appointments',
      value: overview.openHighRisk,
      href: '/admin/appointments?risk=high',
      icon: AlertTriangleIcon,
      tone: 'rose' as const,
      hint: 'AI-flagged or high priority, not yet closed',
    },
    {
      label: 'Unassigned appointments',
      value: overview.unassigned,
      href: '/admin/appointments?assignment=unassigned',
      icon: UserRoundSearchIcon,
      tone: 'amber' as const,
      hint: 'Waiting for a doctor to be assigned',
    },
    {
      label: 'Suspended accounts',
      value: overview.suspended,
      href: '/admin/users?status=suspended',
      icon: BanIcon,
      tone: 'slate' as const,
      hint: 'Blocked from signing in',
    },
  ];

  const toneStyles = {
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={`${greet()}, ${session.user.name.split(' ')[0]}`}
        description='Platform health at a glance: patient growth, clinician capacity, appointment flow and recent security events.'
        actions={<InviteDoctorButton />}
      />

      {/* KPIs */}
      <section
        aria-label='Key metrics'
        className='grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4'>
        <KpiCard
          label='Patients'
          value={overview.patients.total.toLocaleString()}
          change={overview.patients.change}
          hint={`${overview.patients.new} new in 30 days`}
          icon={<UsersIcon className='size-[18px]' />}
          accent='blue'
        />
        <KpiCard
          label='Active doctors'
          value={overview.doctors.total.toLocaleString()}
          hint={`${overview.doctors.available} available right now`}
          icon={<StethoscopeIcon className='size-[18px]' />}
          accent='teal'
        />
        <KpiCard
          label='Appointments · 30d'
          value={overview.appointments.last30.toLocaleString()}
          change={overview.appointments.change}
          hint='vs. previous 30 days'
          icon={<CalendarCheck2Icon className='size-[18px]' />}
          accent='violet'
        />
        <KpiCard
          label='Completion rate'
          value={overview.completionRate == null ? '—' : `${overview.completionRate}%`}
          hint='Completed vs. cancelled, 30 days'
          icon={<GaugeIcon className='size-[18px]' />}
          accent='amber'
        />
      </section>

      {/* Needs attention */}
      <section
        aria-label='Needs attention'
        className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {attention.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className='group flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneStyles[item.tone])}>
              <item.icon
                className='size-5'
                aria-hidden
              />
            </span>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-semibold text-slate-800'>{item.label}</p>
              <p className='truncate text-xs text-slate-500'>{item.hint}</p>
            </div>
            <span className='text-2xl font-extrabold tabular-nums text-slate-900'>{item.value}</span>
            <ChevronRightIcon
              className='size-4 text-slate-300 transition-colors group-hover:text-slate-500'
              aria-hidden
            />
          </Link>
        ))}
      </section>

      {/* Charts */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <Panel
          title='Appointment volume'
          description='By scheduled date'
          icon={<ActivityIcon className='size-4' />}
          className='lg:col-span-8'>
          <AppointmentsTrendChart
            data={trend}
            range={range}
          />
        </Panel>

        <Panel
          title='Pipeline by status'
          description='All appointments'
          icon={<CalendarCheck2Icon className='size-4' />}
          action={<PanelLink href='/admin/appointments'>View all</PanelLink>}
          className='lg:col-span-4'>
          <StatusBreakdown data={breakdown} />
        </Panel>
      </div>

      {/* Workload + activity */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <Panel
          title='Doctor workload'
          description='Ranked by open appointments'
          icon={<StethoscopeIcon className='size-4' />}
          action={<PanelLink href='/admin/doctors'>Manage doctors</PanelLink>}
          className='lg:col-span-7'>
          {workload.length === 0 ? (
            <EmptyState
              icon={<StethoscopeIcon className='size-5' />}
              title='No doctors yet'
              description='Invite your first clinician to start accepting appointments.'
            />
          ) : (
            <ul className='divide-y divide-slate-100'>
              {workload.map(doctor => {
                const capacity = Math.min(100, Math.round((doctor.open / Math.max(1, workload[0].open)) * 100));
                return (
                  <li
                    key={doctor.id}
                    className='flex items-center gap-4 px-5 py-3.5'>
                    <UserAvatar
                      name={doctor.name}
                      image={doctor.doctorProfile?.imageUrl ?? doctor.image}
                    />
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <p className='truncate text-sm font-semibold text-slate-800'>{doctor.name}</p>
                        {doctor.doctorProfile && (
                          <span className='hidden sm:inline-flex'>
                            <AvailabilityBadge status={doctor.doctorProfile.availabilityStatus} />
                          </span>
                        )}
                      </div>
                      <p className='truncate text-xs text-slate-500'>{doctor.doctorProfile?.specialty ?? 'No specialty set'}</p>
                    </div>
                    <div className='hidden w-36 sm:block'>
                      <div className='h-1.5 overflow-hidden rounded-full bg-slate-100'>
                        <div
                          className='h-full rounded-full bg-blue-600'
                          style={{ width: `${capacity}%` }}
                        />
                      </div>
                    </div>
                    <div className='shrink-0 whitespace-nowrap text-right text-xs text-slate-500'>
                      <span className='block text-sm font-bold tabular-nums text-slate-900'>{doctor.open} open</span>
                      {doctor.completed} completed
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title='Recent activity'
          description='From the audit log'
          icon={<ScrollTextIcon className='size-4' />}
          action={<PanelLink href='/admin/audit-logs'>Full log</PanelLink>}
          className='lg:col-span-5'>
          {activity.length === 0 ? (
            <EmptyState
              icon={<ScrollTextIcon className='size-5' />}
              title='No activity yet'
              description='Sign-ins, account changes and record access will appear here.'
            />
          ) : (
            <ol className='divide-y divide-slate-100'>
              {activity.map(event => (
                <li
                  key={event.id}
                  className='flex items-start gap-3 px-5 py-3'>
                  <AuditActionIcon action={event.action} />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm text-slate-700'>
                      <span className='font-semibold text-slate-900'>{event.actor?.name ?? 'System'}</span> · {AUDIT_ACTION_META[event.action].label}
                    </p>
                    {event.summary !== AUDIT_ACTION_META[event.action].label && event.summary !== 'Signed in' && event.summary !== 'Account created' && (
                      <p className='truncate text-xs text-slate-500'>{event.summary}</p>
                    )}
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className='mt-0.5 block text-[11px] text-slate-400'>
                      {formatDistanceToNow(event.createdAt, { addSuffix: true })}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
