import { getPatientProfile } from '@/actions/patient.action';
import PatientAppointmentForm from '@/components/patient/patient-appointment-form';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

const CreateAppointmentPage = async () => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');
  const patientProfile = await getPatientProfile(session?.user?.id);
  return <div>{!patientProfile ? <PatientOnboarding userId={session.user.id} /> : <PatientAppointmentForm userId={session.user.id} />}</div>;
};

export default CreateAppointmentPage;
