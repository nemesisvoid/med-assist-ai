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
    scheduledTime: item.scheduledTime ?? '',
    scheduledDate: item.scheduledAt,
    status: item.status,
    title: item.title,
    painLevel: item.intakeForm?.painLevel ?? null,
    riskLevel: item.riskLevel || 'LOW',
  }));

  return (
    <div>
      <h2 className='text-xl font-semibold mb-2'>Appointments</h2>
      <p className='text-sm text-text-soft mt-1 mb-8'>Manage patients appointments</p>
      <div className='bg-white rounded-md p-5 border border-gray-200 shadow-md'>
        <h3 className='text-base font-medium'>Clinical Queue</h3>

        {!data || data.length === 0 ? (
          <div className='text-base text-center'>You dont have any appointments</div>
        ) : (
          <div className='my-5'>
            <DoctorAppointmentList data={data} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointmentPage;
