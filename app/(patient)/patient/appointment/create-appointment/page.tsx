import { getPatientProfile } from '@/actions/patient.action';
import PatientAppointmentForm from '@/components/patient/patient-appointment-form';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import { clinicAddressLines, getClinicSettings } from '@/lib/clinic';

const CreateAppointmentPage = async () => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');
  const patientProfile = await getPatientProfile();
  const clinic = await getClinicSettings();
  return <div>{!patientProfile ? <PatientOnboarding userId={session.user.id} /> : <PatientAppointmentForm
          userId={session.user.id}
          openingHours={clinic.openingHours}
          timezone={clinic.timezone}
          clinic={{
            name: clinic.name,
            addressLines: clinicAddressLines(clinic),
            inPersonEnabled: clinic.inPersonEnabled,
            videoEnabled: clinic.videoEnabled,
            emergencyNumber: clinic.emergencyNumber,
          }}
        />}</div>;
};

export default CreateAppointmentPage;
