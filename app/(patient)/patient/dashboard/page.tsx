import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isFuture, isPast } from 'date-fns';

import { getPatientAppointments, getPatientProfile, patientStats } from '@/actions/patient.action';
import DashboardCard from '@/components/dashboard-card';
import DashboardStatCard from '@/components/dashboard-stats-card';
import PatientOnboarding from '@/components/patient/patient-onboarding';

import { getLoggedInUser } from '@/lib/get-user';
import { ArrowRightIcon, BellIcon, CalendarIcon, ClockIcon, PillIcon, CheckCircleIcon, MessageCircleIcon } from 'lucide-react';
import AppointmentsList from '@/components/appointments-list';

const PatientDashboardPage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'PATIENT') return redirect('/auth/login');
  const isPatientProfile = await getPatientProfile(session.user.id);
  const appointments = await getPatientAppointments(session.user.id);
  const stats = await patientStats(session.user.id);
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

  const upcomingAppointments = data?.filter(item => isFuture(item.scheduledAt));
  return (
    <div>
      <DashboardCard username={session.user.name} />

      {!isPatientProfile ? (
        <PatientOnboarding userId={session.user.id} />
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-5 my-10'>
            <DashboardStatCard
              stat={stats.upcoming.toString()}
              desc='Upcoming'
              bgColor='bg-blue-100'
              color='text-blue-700'
              icon={<CalendarIcon size={20} />}
            />
            <DashboardStatCard
              stat={stats.pendingIntakeForms.toString()}
              desc='Pending Intake'
              icon={<ClockIcon size={20} />}
              bgColor='bg-yellow-100'
              color='text-yellow-700'
            />
            <DashboardStatCard
              stat={stats.unreadNotifications.toString()}
              desc='Notifications'
              icon={<BellIcon size={20} />}
              bgColor='bg-red-100'
              color='text-red-700'
            />
            <DashboardStatCard
              stat={stats.completedAppointments.toString()}
              desc='Completed'
              icon={<CheckCircleIcon size={20} />}
              bgColor='bg-emerald-100'
              color='text-emerald-700'
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
            <div className='bg-white rounded-sm'>
              <div className='flex justify-between border-b border-gray-200 p-4'>
                <h3 className='text-sm text-text-base font-semibold'>Upcoming Appointments</h3>
                <Link
                  href='/patient/appointments'
                  className='text-sm text-text-soft flex items-center gap-1'>
                  See all
                  <ArrowRightIcon className='size-3.5' />
                </Link>
              </div>
              <AppointmentsList
                isPatient={session.user.role}
                appointments={data}
                isCard={true}
              />
            </div>

            <div className='bg-white rounded-sm'>
              <div className='flex justify-between border-b border-gray-200 p-4'>
                <h3 className='text-sm text-text-base font-semibold'>Notifications</h3>
                <Link
                  href='/patient/notifications'
                  className='text-sm text-text-soft flex items-center gap-1'>
                  See all
                  <ArrowRightIcon className='size-3.5' />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientDashboardPage;
