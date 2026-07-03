import { getDoctorsAppointments } from '@/actions/doctor.action';
import DoctorAppointmentList from '@/components/doctor/doctor-appointment-list';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

const DoctorAppointmentPage = async () => {
  const session = await getLoggedInUser();
  if (!session || !session.user.role || session.user.role === 'PATIENT') return redirect('/auth/login');

  const res = await getDoctorsAppointments(session.user.id);

  const data = res.map(item => ({
    appointmentId: item.id,
    appointmentReason: item.appointmentReason,
    appointmentType: item.appointmentType,
    patientName: item.patient.name,
    intakeFormId: item.intakeForm?.id ?? undefined,
    scheduledTime: item.scheduledTime ?? null,
    scheduledDate: item.scheduledAt,
    status: item.status,
    title: item.title,
    riskLevel: item.riskLevel || 'LOW',
  }));

  return (
    <div className='space-y-1'>
      <h2 className='text-xl font-bold text-text-base'>Appointments</h2>
      <p className='text-sm text-text-muted pb-6'>
        Manage and triage your patient appointments queue
      </p>
      <DoctorAppointmentList data={data} />
    </div>
  );
};

export default DoctorAppointmentPage;
