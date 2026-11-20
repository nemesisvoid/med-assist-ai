import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { IdCardIcon } from 'lucide-react';

import { getLoggedInUser } from '@/lib/get-user';
import { prisma } from '@/lib/prisma';
import { hasPasswordLogin } from '@/lib/data/account';
import SettingsSection from '@/components/shared/settings-section';
import ChangePasswordForm from '@/components/shared/change-password-form';
import PatientHealthProfileForm from '@/components/patient/patient-health-profile-form';
import PatientProfileForm from '@/components/patient/patient-profile-form';

export const metadata: Metadata = { title: 'My profile' };

const GENDER_LABEL = { MALE: 'Male', FEMALE: 'Female' } as const;

/** Dates of birth are calendar dates, so show them without a timezone shift. */
const formatDob = (date: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

const PatientProfilePage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'PATIENT') redirect('/auth/login');
  const { user } = session;

  const [profile, hasPassword] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { userId: user.id } }),
    hasPasswordLogin(user.id),
  ]);

  const details: { label: string; value: string }[] = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    ...(profile
      ? [
          { label: 'Medical record number', value: profile.medicalRecordNumber },
          { label: 'Date of birth', value: formatDob(profile.dateOfBirth) },
          { label: 'Sex', value: GENDER_LABEL[profile.gender] },
        ]
      : []),
  ];

  return (
    <div className={profile ? 'flex flex-col gap-6 pb-24' : 'flex flex-col gap-6'}>
      <header>
        <h1 className='text-2xl font-extrabold tracking-tight text-slate-900'>My profile</h1>
        <p className='mt-1 text-sm text-slate-500'>Your details, health information and sign-in settings.</p>
      </header>

      <SettingsSection title='Account' description='Used to identify you at the clinic.' icon={<IdCardIcon className='size-4' />}>
        <dl className='grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3'>
          {details.map(d => (
            <div key={d.label} className='min-w-0'>
              <dt className='text-[11px] font-bold uppercase tracking-wider text-slate-500'>{d.label}</dt>
              <dd className='mt-1 truncate text-sm font-medium text-slate-800'>{d.value}</dd>
            </div>
          ))}
        </dl>
        <p className='text-xs text-slate-500'>To correct your name, date of birth or sex, please contact the clinic so your records stay consistent.</p>
      </SettingsSection>

      {profile ? (
        <PatientHealthProfileForm
          initial={{
            genotype: profile.genotype,
            bloodGroup: profile.bloodGroup,
            allergies: profile.allergies ?? '',
            medications: profile.medications ?? '',
            medicalHistory: profile.medicalHistory ?? '',
            emergencyContact: profile.emergencyContact ?? '',
            insuranceProvider: profile.insuranceProvider ?? '',
          }}
        />
      ) : (
        <div className='flex flex-col items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-6'>
          <div>
            <h2 className='text-sm font-bold text-slate-800'>Set up your medical profile</h2>
            <p className='mt-1 text-sm text-slate-600'>Add your health details once so clinicians have them before your first visit. You’ll need this to book.</p>
          </div>
          <PatientProfileForm userId={user.id} />
        </div>
      )}

      <ChangePasswordForm email={user.email} hasPassword={hasPassword} />
    </div>
  );
};

export default PatientProfilePage;
