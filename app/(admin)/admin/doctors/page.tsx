import type { Metadata } from 'next';
import Link from 'next/link';
import { StethoscopeIcon } from 'lucide-react';

import { AccountStatusBadge, EmptyState, PageHeader, UserAvatar } from '@/components/admin/admin-ui';
import { ClearFilters, FilterBar, SearchFilter, SelectFilter } from '@/components/admin/admin-filters';
import { AvailabilitySelect, InviteDoctorButton, ResendInviteButton } from '@/components/admin/doctor-actions';
import { listDoctors } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import { formatDoctorName, PROVIDER_TYPE_LABEL } from '@/lib/utils';
import type { DoctorAvailabilityStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Doctors' };

const AVAILABILITY: DoctorAvailabilityStatus[] = ['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_LEAVE'];

const DoctorsPage = async ({ searchParams }: { searchParams: Promise<{ q?: string; availability?: string }> }) => {
  await requireAdminPage();
  const params = await searchParams;
  const availability = AVAILABILITY.includes(params.availability as DoctorAvailabilityStatus) ? (params.availability as DoctorAvailabilityStatus) : undefined;
  const doctors = await listDoctors({ q: params.q, availability });

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Clinicians'
        description='Onboard doctors and therapists, track their caseload and set availability for appointment assignment.'
        actions={<InviteDoctorButton />}
      />

      <section className='overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm'>
        <FilterBar>
          <SearchFilter placeholder='Search by name, email or specialty…' />
          <SelectFilter
            param='availability'
            label='Availability'
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'BUSY', label: 'Busy' },
              { value: 'OFFLINE', label: 'Offline' },
              { value: 'ON_LEAVE', label: 'On leave' },
            ]}
          />
          <ClearFilters params={['q', 'availability']} />
        </FilterBar>

        {doctors.length === 0 ? (
          <EmptyState
            icon={<StethoscopeIcon className='size-5' />}
            title={params.q || availability ? 'No doctors match these filters' : 'No doctors yet'}
            description={params.q || availability ? 'Try a different search or clear the filters.' : 'Invite your first clinician to start accepting appointments.'}
            action={!params.q && !availability ? <InviteDoctorButton /> : undefined}
          />
        ) : (
          <ul className='grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3'>
            {doctors.map(doctor => (
              <li
                key={doctor.id}
                className='flex flex-col gap-4 bg-white p-5'>
                <div className='flex items-start gap-3'>
                  <UserAvatar
                    name={doctor.name}
                    image={doctor.doctorProfile?.imageUrl ?? doctor.image}
                    size='lg'
                  />
                  <div className='min-w-0 flex-1'>
                    <Link
                      href={`/admin/users/${doctor.id}`}
                      className='block truncate text-sm font-bold text-slate-900 hover:text-blue-600'>
                      {formatDoctorName(doctor.name, doctor.doctorProfile)}
                    </Link>
                    <p className='truncate text-xs font-medium text-blue-700'>
                      {PROVIDER_TYPE_LABEL[doctor.doctorProfile?.providerType ?? 'DOCTOR']} · {doctor.doctorProfile?.specialty ?? 'No specialty'}
                    </p>
                    <p className='mt-0.5 truncate text-xs text-slate-500'>{doctor.email}</p>
                  </div>
                  <AccountStatusBadge
                    banned={doctor.banned}
                    invitePending={doctor.invitePending}
                  />
                </div>

                <dl className='grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center'>
                  {[
                    { label: 'Open', value: doctor.open },
                    { label: 'Completed', value: doctor.completed },
                    { label: 'Experience', value: doctor.doctorProfile?.yearsOfExperience != null ? `${doctor.doctorProfile.yearsOfExperience}y` : '—' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <dt className='text-[11px] font-medium text-slate-500'>{stat.label}</dt>
                      <dd className='text-base font-extrabold tabular-nums text-slate-900'>{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className='mt-auto flex items-center justify-between gap-2'>
                  {doctor.doctorProfile ? (
                    <AvailabilitySelect
                      userId={doctor.id}
                      doctorName={doctor.name}
                      value={doctor.doctorProfile.availabilityStatus}
                      disabled={doctor.banned}
                    />
                  ) : (
                    <span className='text-xs text-slate-500'>No profile</span>
                  )}
                  {doctor.invitePending && !doctor.banned && <ResendInviteButton userId={doctor.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DoctorsPage;
