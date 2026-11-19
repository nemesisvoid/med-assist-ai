import { getPatientAppointmentById } from '@/actions/patient.action';
import PatientAppointmentDetails from '@/components/patient/patient-appointment-details';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import { clinicAddressLines, getClinicSettings } from '@/lib/clinic';

const PatientAppointmentDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const session = await getLoggedInUser();

  if (!session || session.user.role !== 'PATIENT') {
    return redirect('/auth/login');
  }

  const patientAppointment = await getPatientAppointmentById(id);
  if (!patientAppointment) return <div>Appointment not found</div>;

  const clinic = await getClinicSettings();
  return (
    <PatientAppointmentDetails
      appointment={patientAppointment}
      clinic={{
        name: clinic.name,
        addressLines: clinicAddressLines(clinic),
        mapUrl: clinic.mapUrl,
        arrivalInstructions: clinic.arrivalInstructions,
        phone: clinic.phone,
      }}
    />
  );
};

export default PatientAppointmentDetailsPage;
