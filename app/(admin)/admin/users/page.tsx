import type { Metadata } from 'next';
import { formatDistanceToNow } from 'date-fns';
import { UsersIcon } from 'lucide-react';

import { AccountStatusBadge, EmptyState, formatDate, PageHeader, RoleBadge, UserIdentity } from '@/components/admin/admin-ui';
import { ClearFilters, FilterBar, SearchFilter, SelectFilter } from '@/components/admin/admin-filters';
import Pagination from '@/components/admin/pagination';
import { UserRowActions } from '@/components/admin/user-actions';
import { InviteDoctorButton } from '@/components/admin/doctor-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUserRoleCounts, listUsers, type UserStatusFilter } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import type { Role } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Users' };

type SearchParams = Promise<{ q?: string; role?: string; status?: string; page?: string }>;

const ROLES: Role[] = ['PATIENT', 'DOCTOR', 'ADMIN'];
const STATUSES: UserStatusFilter[] = ['active', 'unverified', 'suspended'];

const UsersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const session = await requireAdminPage();
  const params = await searchParams;
  const role = ROLES.includes(params.role as Role) ? (params.role as Role) : undefined;
  const status = STATUSES.includes(params.status as UserStatusFilter) ? (params.status as UserStatusFilter) : undefined;

  const [result, counts] = await Promise.all([listUsers({ q: params.q, role, status, page: Number(params.page) }), getUserRoleCounts()]);

  const summary = [
    { label: 'Patients', value: counts.PATIENT },
    { label: 'Doctors', value: counts.DOCTOR },
    { label: 'Admins', value: counts.ADMIN },
    { label: 'Suspended', value: counts.suspended },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Users'
        description='Every account on the platform. Change roles, suspend compromised accounts and sign users out of all devices.'
        actions={<InviteDoctorButton />}
      />

      <dl className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {summary.map(item => (
          <div
            key={item.label}
            className='rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm'>
            <dt className='text-xs font-medium text-slate-500'>{item.label}</dt>
            <dd className='text-xl font-extrabold tabular-nums text-slate-900'>{item.value}</dd>
          </div>
        ))}
      </dl>

      <section className='overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm'>
        <FilterBar>
          <SearchFilter placeholder='Search by name, email or MRN…' />
          <SelectFilter
            param='role'
            label='Role'
            options={[
              { value: 'PATIENT', label: 'Patients' },
              { value: 'DOCTOR', label: 'Doctors' },
              { value: 'ADMIN', label: 'Admins' },
            ]}
          />
          <SelectFilter
            param='status'
            label='Status'
            options={[
              { value: 'active', label: 'Active' },
              { value: 'unverified', label: 'Unverified' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
          <ClearFilters params={['q', 'role', 'status']} />
        </FilterBar>

        {result.items.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className='size-5' />}
            title='No users match these filters'
            description='Try a different search term or clear the filters.'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='hidden lg:table-cell'>Details</TableHead>
                <TableHead className='hidden md:table-cell'>Last sign-in</TableHead>
                <TableHead className='hidden xl:table-cell'>Joined</TableHead>
                <TableHead className='w-12'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map(user => {
                const lastSignIn = user.lastSignInAt;
                return (
                  <TableRow key={user.id}>
                    <TableCell className='max-w-72'>
                      <UserIdentity
                        name={user.name}
                        email={user.email}
                        image={user.image}
                        href={`/admin/users/${user.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge
                        banned={user.banned}
                        emailVerified={user.emailVerified}
                        invitePending={user.invitePending}
                      />
                    </TableCell>
                    <TableCell className='hidden text-xs text-slate-500 lg:table-cell'>
                      {user.doctorProfile?.specialty ?? (user.patientProfile ? <span className='font-mono'>{user.patientProfile.medicalRecordNumber}</span> : '—')}
                    </TableCell>
                    <TableCell className='hidden text-xs text-slate-500 md:table-cell'>
                      {lastSignIn ? formatDistanceToNow(lastSignIn, { addSuffix: true }) : 'Never'}
                    </TableCell>
                    <TableCell className='hidden text-xs text-slate-500 xl:table-cell'>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className='text-right'>
                      <UserRowActions
                        isSelf={user.id === session.user.id}
                        user={{ id: user.id, name: user.name, role: user.role, banned: user.banned, hasDoctorProfile: !!user.doctorProfile }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Pagination
          pathname='/admin/users'
          searchParams={params}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          noun='users'
        />
      </section>
    </div>
  );
};

export default UsersPage;
