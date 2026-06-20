import { getPatientAppointmentById } from '@/actions/patient.action';
import PatientAppointmentDetails from '@/components/patient/patient-appointment-details';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

const PatientAppointmentDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const session = await getLoggedInUser();

  if (!session || session.user.role !== 'PATIENT') {
    return redirect('/auth/login');
  }

  const patientAppointment = await getPatientAppointmentById(id, session.user.id);
  if (!patientAppointment) return <div>Appointment not found</div>;

  return <PatientAppointmentDetails appointment={patientAppointment} />;
};

export default PatientAppointmentDetailsPage;
