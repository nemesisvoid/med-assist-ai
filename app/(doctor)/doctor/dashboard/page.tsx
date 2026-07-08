import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isFuture, compareAsc, formatDistanceToNow } from 'date-fns';

import DashboardStatCard from '@/components/dashboard-stats-card';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import DoctorAppointmentCard from '@/components/doctor/doctor-appointment-card';
import AppointmentCalendar from '@/components/doctor/appointment-calendar';
import RecentPatientsWidget from '@/components/doctor/recent-patients-widget';

import { getLoggedInUser } from '@/lib/get-user';
import { getDoctorProfile, getDoctorsAppointments, getRecentPatients } from '@/actions/doctor.action';
import { getUserNotifications } from '@/actions/patient.action';
import { cn } from '@/lib/utils';

import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  MessageSquareIcon,
  FileTextIcon,
  ActivityIcon,
} from 'lucide-react';

const DoctorDashboardPage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'DOCTOR') return redirect('/auth/login');

  const isDoctorProfile = await getDoctorProfile(session.user.id);
  const appointments = await getDoctorsAppointments(session.user.id);
  const notifications = await getUserNotifications(session.user.id);
  const recentPatients = await getRecentPatients(session.user.id);

  // Dynamic Metrics Calculations
  const upcomingCount = appointments.filter(item => isFuture(new Date(item.scheduledAt))).length;
  const pendingIntakeCount = appointments.filter(item => !item.intakeForm?.id).length;
  const unreadNotificationsCount = notifications.filter(item => !item.isRead).length;
  const recentNotifications = notifications.slice(0, 4);

  const data = appointments.map(item => ({
    scheduledAt: item.scheduledAt,
    scheduledTime: item.scheduledTime,
    title: item.title,
    appointmentId: item.id,
    appointmentType: item.appointmentType,
    appointmentReason: item.appointmentReason,
    intakeFormId: item.intakeForm?.id ?? undefined,
    patientName: item.patient.name,
    status: item.status,
    riskLevel: item.riskLevel || 'LOW',
    scheduledDate: item.scheduledAt,
  }));

  // Single next upcoming appointment for the dashboard card
  const nextAppointment = [...appointments]
    .filter(item => isFuture(new Date(item.scheduledAt)))
    .sort((a, b) => compareAsc(new Date(a.scheduledAt), new Date(b.scheduledAt)))[0] ?? null;

  return (
    <div className='max-w-7xl mx-auto px-4 py-8 space-y-8'>
      {/* Premium Healthcare Welcome Banner */}
      <div className='relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-8 py-8 md:py-10 rounded-2xl border border-slate-800 shadow-xl'>
        {/* Glowing visual indicators */}
        <div className='absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none' />

        <div className='relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10'>
          <div className='space-y-3.5'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400'>
              <ActivityIcon className='w-3.5 h-3.5 animate-pulse text-emerald-400' />
              Clinical Workspace Active
            </div>
            <h1 className='text-3xl font-extrabold text-white tracking-tight'>
              Welcome back, <span className='bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent'>Dr. {session.user.name}</span>
            </h1>
            <p className='text-slate-400 text-sm max-w-xl leading-relaxed'>
              Review upcoming appointments, update patient intake documentation, and manage diagnostic reports seamlessly from your clinical dashboard.
            </p>
          </div>
        </div>
      </div>

      {!isDoctorProfile ? (
        <PatientOnboarding userId={session.user.id} />
      ) : (
        <div className='space-y-8'>
          {/* Dynamic Metrics Section */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <DashboardStatCard
              stat={upcomingCount.toString()}
              desc='Upcoming Appointments'
              bgColor='bg-blue-50 text-blue-600'
              color='text-blue-600'
              icon={<CalendarIcon size={20} />}
            />
            <DashboardStatCard
              stat={pendingIntakeCount.toString()}
              desc='Pending Intake Forms'
              icon={<ClockIcon size={20} />}
              bgColor='bg-amber-50 text-amber-600'
              color='text-amber-600'
            />
            <DashboardStatCard
              stat={unreadNotificationsCount.toString()}
              desc='Unread Notifications'
              icon={<BellIcon size={20} />}
              bgColor='bg-rose-50 text-rose-600'
              color='text-rose-600'
            />
          </div>

          {/* Main Dashboard Workspace Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            {/* Left Column Workspace */}
            <div className='lg:col-span-8 flex flex-col gap-8'>
              {/* Next Upcoming Appointment Panel */}
              <div className='bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-fit'>
              <div className='flex justify-between items-center border-b border-slate-100 p-5 bg-slate-50/50'>
                <div className='flex items-center gap-2'>
                  <CalendarIcon className='w-4 h-4 text-slate-500' />
                  <h2 className='text-sm font-bold text-slate-800 uppercase tracking-wider'>Next Appointment</h2>
                </div>
                <Link
                  href='/doctor/appointment'
                  className='text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors hover:underline'>
                  View all
                  <ArrowRightIcon className='w-3.5 h-3.5' />
                </Link>
              </div>

              <div className='p-6'>
                {nextAppointment ? (
                  <DoctorAppointmentCard
                    data={{
                      appointmentId: nextAppointment.id,
                      appointmentType: nextAppointment.appointmentType,
                      appointmentReason: nextAppointment.appointmentReason,
                      patientName: nextAppointment.patient.name,
                      scheduledTime: nextAppointment.scheduledTime,
                      scheduledDate: nextAppointment.scheduledAt,
                      title: nextAppointment.title,
                      intakeFormId: nextAppointment.intakeForm?.id ?? undefined,
                      status: nextAppointment.status,
                      riskLevel: nextAppointment.riskLevel || 'LOW',
                    }}
                  />
                ) : (
                  <div className='flex flex-col items-center justify-center py-16 text-center'>
                    <div className='w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400'>
                      <CalendarIcon className='w-6 h-6' />
                    </div>
                    <p className='text-sm font-bold text-slate-700 mb-1'>No upcoming appointments</p>
                    <p className='text-xs text-slate-400 max-w-[200px] leading-relaxed'>
                      Your patient queue is clear. New appointments will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Patients Widget */}
            <RecentPatientsWidget recentPatients={recentPatients} />
          </div>

            {/* Right Sidebar: Schedule & Notifications */}
            <div className='lg:col-span-4 flex flex-col gap-8'>
              <AppointmentCalendar appointments={data} />

              {/* Notifications Panel */}
              <div className='bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col'>
                <div className='flex justify-between items-center border-b border-slate-100 p-5 bg-slate-50/50'>
                  <div className='flex items-center gap-2'>
                    <BellIcon className='w-4 h-4 text-slate-500' />
                    <h2 className='text-sm font-bold text-slate-800 uppercase tracking-wider'>Recent Notifications</h2>
                  </div>
                  <Link
                    href='/doctor/notification'
                    className='text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors hover:underline'>
                    See all Inbox
                    <ArrowRightIcon className='w-3.5 h-3.5' />
                  </Link>
                </div>

                <div className='p-6 flex-1'>
                  {recentNotifications.length === 0 ? (
                    <div className='text-sm text-slate-400 flex flex-col items-center justify-center py-16 gap-3.5'>
                      <div className='p-4 rounded-full bg-slate-50 border border-slate-100/50'>
                        <BellIcon className='w-8 h-8 text-slate-300' />
                      </div>
                      <p className='font-medium text-slate-500'>No recent notifications</p>
                    </div>
                  ) : (
                    <ul className='flex flex-col gap-4'>
                      {recentNotifications.map(notification => {
                        let IconComponent = BellIcon;
                        let iconColor = 'text-slate-500 bg-slate-50 border-slate-100/80';

                        if (notification.type === 'APPOINTMENT') {
                          IconComponent = CalendarIcon;
                          iconColor = 'text-blue-600 bg-blue-50 border-blue-100/30';
                        } else if (notification.type === 'MESSAGE') {
                          IconComponent = MessageSquareIcon;
                          iconColor = 'text-emerald-600 bg-emerald-50 border-emerald-100/30';
                        } else if (notification.type === 'FOLLOW_UP') {
                          IconComponent = ClockIcon;
                          iconColor = 'text-amber-600 bg-amber-50 border-amber-100/30';
                        } else if (notification.type === 'CLINICAL_NOTE') {
                          IconComponent = FileTextIcon;
                          iconColor = 'text-indigo-600 bg-indigo-50 border-indigo-100/30';
                        }

                        return (
                          <li key={notification.id} className={cn('p-4 rounded-xl border transition-all hover:bg-slate-50/50', notification.isRead ? 'border-slate-100' : 'border-blue-100 bg-blue-50/20')}>
                            <Link href='/doctor/notification' className='flex gap-3.5 items-start cursor-pointer w-full text-left'>
                              <div className={cn('p-2 rounded-xl shrink-0 border', iconColor)}>
                                <IconComponent className='w-4 h-4' />
                              </div>
                              <div className='flex-1 min-w-0 space-y-1'>
                                <div className='flex items-center justify-between gap-2'>
                                  <p className='text-xs font-bold text-slate-800 truncate'>{notification.title}</p>
                                  {!notification.isRead && <span className='shrink-0 w-2 h-2 rounded-full bg-blue-500' />}
                                </div>
                                <p className='text-xs text-slate-500 line-clamp-2 leading-relaxed'>{notification.message}</p>
                                <span className='text-[10px] text-slate-400 font-semibold block pt-1'>
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboardPage;
