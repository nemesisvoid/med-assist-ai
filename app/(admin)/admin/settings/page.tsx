import type { Metadata } from 'next';

import { PageHeader } from '@/components/admin/admin-ui';
import ClinicSettingsForm from '@/components/admin/clinic-settings-form';
import { requireAdminPage } from '@/lib/authz';
import { getClinicSettings } from '@/lib/clinic';

export const metadata: Metadata = { title: 'Clinic settings' };

const ClinicSettingsPage = async () => {
  await requireAdminPage();
  const settings = await getClinicSettings();
  const timezones = Intl.supportedValuesOf('timeZone');

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Clinic settings'
        description='Your clinic’s details, opening hours, visit types and emergency number. Patients see these when booking and on their appointments. Every change is recorded in the audit log.'
      />
      <ClinicSettingsForm
        initial={{
          name: settings.name,
          phone: settings.phone ?? '',
          email: settings.email ?? '',
          addressLine1: settings.addressLine1 ?? '',
          addressLine2: settings.addressLine2 ?? '',
          city: settings.city ?? '',
          state: settings.state ?? '',
          postalCode: settings.postalCode ?? '',
          country: settings.country ?? '',
          mapUrl: settings.mapUrl ?? '',
          arrivalInstructions: settings.arrivalInstructions ?? '',
          timezone: settings.timezone,
          openingHours: settings.openingHours,
          inPersonEnabled: settings.inPersonEnabled,
          videoEnabled: settings.videoEnabled,
          emergencyNumber: settings.emergencyNumber ?? '',
        }}
        timezones={timezones}
        lastUpdated={settings.updatedAt?.toISOString() ?? null}
      />
    </div>
  );
};

export default ClinicSettingsPage;
