import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/get-user';
import { getDoctorsAppointments } from '@/actions/doctor.action';
import FullCalendarView from '@/components/doctor/full-calendar-view';
import { CalendarIcon } from 'lucide-react';

export default async function DoctorCalendarPage() {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'DOCTOR') return redirect('/auth/login');

  const appointments = await getDoctorsAppointments(session.user.id);

  const data = appointments.map((item) => ({
    scheduledAt: item.scheduledAt,
    scheduledTime: item.scheduledTime,
    title: item.title,
    appointmentId: item.id,
    appointmentType: item.appointmentType,
    appointmentReason: item.appointmentReason,
    patientName: item.patient.name,
    status: item.status,
  }));

  return (
    <div className='max-w-7xl mx-auto px-4 py-8 space-y-8 h-full'>
      <div className='flex items-center gap-3'>
        <div className='p-3 bg-blue-100/50 text-blue-600 rounded-xl'>
          <CalendarIcon className='w-6 h-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-slate-800 tracking-tight'>Appointments Calendar</h1>
          <p className='text-sm text-slate-500'>View and manage your schedule across daily, weekly, and monthly views.</p>
        </div>
      </div>
      
      <FullCalendarView appointments={data} />
    </div>
  );
}
