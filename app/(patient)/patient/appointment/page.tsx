import { getPatientAppointments, getPatientProfile } from '@/actions/patient.action';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import AppointmentsList from '@/components/appointments-list';

const PatientAppointmentPage = async () => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');
  const patientProfile = await getPatientProfile(session.user.id);
  const appointments = await getPatientAppointments(session.user.id);
  const data = appointments.map(item => ({
    scheduledAt: item.scheduledAt,
    scheduledTime: item.scheduledTime,
    title: item.title,
    appointmentId: item.id,
    appointmentType: item.appointmentType,
    appointmentReason: item.appointmentReason,
    intakeFormId: item.intakeForm?.id,
    doctor: item.doctor?.name,
  }));
  return (
    <div>
      {!patientProfile ? (
        <PatientOnboarding userId={session.user.id} />
      ) : (
        <AppointmentsList
          appointments={data}
          isPatient={session.user.role}
        />
      )}
    </div>
  );
};

export default PatientAppointmentPage;
