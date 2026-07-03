import { getPatientAppointments, getPatientProfile } from '@/actions/patient.action';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import PatientAppointmentsList from '@/components/patient/patient-appointments-list';

const PatientAppointmentPage = async () => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');

  const patientProfile = await getPatientProfile(session.user.id);
  const appointments = await getPatientAppointments(session.user.id);

  const data = appointments.map(item => ({
    appointmentId: item.id,
    scheduledAt: item.scheduledAt,
    scheduledTime: item.scheduledTime,
    appointmentType: item.appointmentType,
    appointmentReason: item.appointmentReason,
    intakeFormId: item.intakeForm?.id ?? null,
    doctor: item.doctor?.name ?? null,
    status: item.status ?? null,
  }));

  return (
    <div>
      {!patientProfile ? (
        <PatientOnboarding userId={session.user.id} />
      ) : (
        <PatientAppointmentsList appointments={data} />
      )}
    </div>
  );
};

export default PatientAppointmentPage;
