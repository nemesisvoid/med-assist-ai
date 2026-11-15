import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeftIcon, BanIcon, KeyRoundIcon, LaptopIcon, ScrollTextIcon, ShieldAlertIcon, UserIcon } from 'lucide-react';

import {
  AccountStatusBadge,
  AvailabilityBadge,
  describeUserAgent,
  EmptyState,
  formatDate,
  formatDateTime,
  Panel,
  RoleBadge,
  UserAvatar,
} from '@/components/admin/admin-ui';
import { AuditActionIcon, AUDIT_ACTION_META } from '@/components/admin/audit-meta';
import { UserDetailActions } from '@/components/admin/user-actions';
import { getUserDetail } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';

export const metadata: Metadata = { title: 'User details' };

const providerLabel: Record<string, string> = { credential: 'Email & password', google: 'Google' };

const UserDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await requireAdminPage();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, activity } = detail;
  const isSelf = user.id === session.user.id;

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Email', value: <span className='break-all'>{user.email}</span> },
    { label: 'Email verified', value: user.emailVerified ? 'Yes' : 'No' },
    { label: 'Sign-in methods', value: user.accounts.length ? user.accounts.map(a => providerLabel[a.providerId] ?? a.providerId).join(', ') : 'None yet (invite pending)' },
    { label: 'Member since', value: formatDate(user.createdAt) },
    { label: 'Last seen', value: user.lastSeen ? formatDistanceToNow(user.lastSeen, { addSuffix: true }) : '—' },
  ];

  if (user.patientProfile) {
    facts.push({ label: 'Medical record no.', value: <span className='font-mono'>{user.patientProfile.medicalRecordNumber}</span> });
    facts.push({ label: 'Appointments booked', value: user._count.patientAppointments });
  }
  if (user.doctorProfile) {
    facts.push({ label: 'Specialty', value: user.doctorProfile.specialty });
    facts.push({ label: 'License no.', value: user.doctorProfile.licenseNumber ?? '—' });
    facts.push({ label: 'Experience', value: user.doctorProfile.yearsOfExperience != null ? `${user.doctorProfile.yearsOfExperience} years` : '—' });
    facts.push({ label: 'Availability', value: <AvailabilityBadge status={user.doctorProfile.availabilityStatus} /> });
    facts.push({ label: 'Appointments assigned', value: user._count.doctorAppointments });
  }

  return (
    <div className='flex flex-col gap-6'>
      <Link
        href='/admin/users'
        className='inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900'>
        <ArrowLeftIcon
          className='size-4'
          aria-hidden
        />
        All users
      </Link>

      <header className='flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:flex-row sm:items-center'>
        <UserAvatar
          name={user.name}
          image={user.image}
          size='lg'
        />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-xl font-extrabold tracking-tight text-slate-900'>{user.name}</h1>
            <RoleBadge role={user.role} />
            <AccountStatusBadge
              banned={user.banned}
              emailVerified={user.emailVerified}
              invitePending={user.role === 'DOCTOR' && user.accounts.length === 0}
            />
            {isSelf && <span className='text-xs font-medium text-slate-500'>(you)</span>}
          </div>
          <p className='mt-0.5 truncate text-sm text-slate-500'>{user.email}</p>
        </div>
      </header>

      {user.banned && (
        <div
          role='status'
          className='flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800'>
          <BanIcon
            className='mt-0.5 size-4 shrink-0'
            aria-hidden
          />
          <div>
            <p className='font-bold'>Suspended {user.bannedAt ? formatDistanceToNow(user.bannedAt, { addSuffix: true }) : ''}</p>
            {user.banReason && <p className='mt-0.5 text-rose-700'>Reason: {user.banReason}</p>}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <Panel
            title='Account'
            icon={<UserIcon className='size-4' />}>
            <dl className='divide-y divide-slate-100'>
              {facts.map(fact => (
                <div
                  key={fact.label}
                  className='flex items-start justify-between gap-4 px-5 py-3 text-sm'>
                  <dt className='shrink-0 text-slate-500'>{fact.label}</dt>
                  <dd className='text-right font-medium text-slate-800'>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title='Manage account'
            icon={<ShieldAlertIcon className='size-4' />}
            bodyClassName='p-5'>
            <UserDetailActions
              isSelf={isSelf}
              user={{ id: user.id, name: user.name, role: user.role, banned: user.banned, hasDoctorProfile: !!user.doctorProfile }}
            />
          </Panel>

          <p className='flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500'>
            <KeyRoundIcon
              className='mt-0.5 size-3.5 shrink-0'
              aria-hidden
            />
            Clinical records are intentionally not shown here. Administrators see account data only (HIPAA minimum-necessary standard).
          </p>
        </div>

        <div className='flex flex-col gap-6 lg:col-span-8'>
          <Panel
            title='Active sessions'
            description={`${user.sessions.length} signed-in device${user.sessions.length === 1 ? '' : 's'}`}
            icon={<LaptopIcon className='size-4' />}>
            {user.sessions.length === 0 ? (
              <EmptyState
                icon={<LaptopIcon className='size-5' />}
                title='No active sessions'
                description='This user is not signed in on any device.'
              />
            ) : (
              <ul className='divide-y divide-slate-100'>
                {user.sessions.map(s => (
                  <li
                    key={s.id}
                    className='flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm'>
                    <div>
                      <p className='font-semibold text-slate-800'>{describeUserAgent(s.userAgent)}</p>
                      <p className='text-xs text-slate-500'>{s.ipAddress ?? 'Unknown IP'}</p>
                    </div>
                    <div className='text-right text-xs text-slate-500'>
                      <p>Signed in {formatDistanceToNow(s.createdAt, { addSuffix: true })}</p>
                      <p>Expires {formatDate(s.expiresAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title='Activity'
            description='Events by or about this account'
            icon={<ScrollTextIcon className='size-4' />}>
            {activity.length === 0 ? (
              <EmptyState
                icon={<ScrollTextIcon className='size-5' />}
                title='No recorded activity'
              />
            ) : (
              <ol className='divide-y divide-slate-100'>
                {activity.map(event => (
                  <li
                    key={event.id}
                    className='flex items-start gap-3 px-5 py-3'>
                    <AuditActionIcon action={event.action} />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm text-slate-700'>
                        <span className='font-semibold text-slate-900'>{AUDIT_ACTION_META[event.action].label}</span>
                        {event.actor && event.actor.id !== user.id && <span className='text-slate-500'> by {event.actor.name}</span>}
                      </p>
                      <p className='text-xs text-slate-500'>{event.summary}</p>
                    </div>
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className='shrink-0 text-[11px] text-slate-400'>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
