import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getLoggedInUser } from '@/lib/get-user';
import { hasPasswordLogin } from '@/lib/data/account';
import { prisma } from '@/lib/prisma';
import { getClinicSettings } from '@/lib/clinic';
import { parseOpeningHours } from '@/lib/clinic-hours';
import { formatDoctorName, PROVIDER_TYPE_LABEL } from '@/lib/utils';
import ClinicianProfileForm from '@/components/doctor/clinician-profile-form';
import ChangePasswordForm from '@/components/shared/change-password-form';

export const metadata: Metadata = { title: 'My profile' };

const ClinicianProfilePage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'DOCTOR') redirect('/auth/login');

  const [profile, clinic, hasPassword] = await Promise.all([
    prisma.doctorProfile.findUnique({ where: { userId: session.user.id } }),
    getClinicSettings(),
    hasPasswordLogin(session.user.id),
  ]);

  if (!profile) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800'>
          Your clinician profile hasn’t been set up yet. Please contact an administrator.
        </div>
        <ChangePasswordForm email={session.user.email} hasPassword={hasPassword} />
      </div>
    );
  }

  return (
    // Bottom padding leaves room for the fixed "Save profile" bar.
    <div className='flex flex-col gap-6 pb-24'>
      <header>
        <h1 className='text-2xl font-extrabold tracking-tight text-slate-900'>My profile</h1>
        <p className='mt-1 text-sm text-slate-500'>
          {formatDoctorName(session.user.name, profile)} · {PROVIDER_TYPE_LABEL[profile.providerType]}
          {profile.licenseNumber ? ` · Licence ${profile.licenseNumber}` : ''}
        </p>
      </header>
      <ClinicianProfileForm
        isTherapist={profile.providerType === 'THERAPIST'}
        clinicHours={clinic.openingHours}
        clinicTimezone={clinic.timezone}
        initial={{
          specialty: profile.specialty,
          bio: profile.bio ?? '',
          yearsOfExperience: profile.yearsOfExperience === null ? '' : String(profile.yearsOfExperience),
          credentials: profile.credentials ?? '',
          availabilityStatus: profile.availabilityStatus,
          workingHours: profile.workingHours ? parseOpeningHours(profile.workingHours) : null,
        }}
      />
      <ChangePasswordForm email={session.user.email} hasPassword={hasPassword} />
    </div>
  );
};

export default ClinicianProfilePage;
