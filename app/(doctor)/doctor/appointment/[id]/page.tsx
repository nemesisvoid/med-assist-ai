import { getDoctorAppointmentById } from '@/actions/doctor.action';
import { getLoggedInUser } from '@/lib/get-user';
import DoctorAppointmentDetails from '@/components/doctor/doctor-appointment-details';
import { redirect } from 'next/navigation';

const DoctorAppointmentDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await getLoggedInUser();

  if (!session || session.user.role !== 'DOCTOR') {
    return redirect('/auth/login');
  }

  const appointment = await getDoctorAppointmentById(id);
  if (!appointment) {
    return (
      <div className='flex items-center justify-center min-h-[50vh]'>
        <div className='text-center space-y-2'>
          <h2 className='font-bold text-xl text-slate-800'>Appointment Not Found</h2>
          <p className='text-sm text-slate-500'>The clinical case case file could not be retrieved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto space-y-6'>
      <DoctorAppointmentDetails
        appointment={appointment}
        doctorUser={session.user}
      />
    </div>
  );
};

export default DoctorAppointmentDetailsPage;
