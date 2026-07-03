import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isFuture, compareAsc, formatDistanceToNow } from 'date-fns';

import { getPatientAppointments, getPatientProfile, patientStats } from '@/actions/patient.action';
import { getUserNotifications } from '@/actions/patient.action';
import DashboardCard from '@/components/dashboard-card';
import DashboardStatCard from '@/components/dashboard-stats-card';
import PatientOnboarding from '@/components/patient/patient-onboarding';
import PatientAppointmentCard from '@/components/patient/patient-appointment-card';

import { getLoggedInUser } from '@/lib/get-user';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  CalendarOff,
  ClockIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  FileTextIcon,
} from 'lucide-react';

const PatientDashboardPage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'PATIENT') return redirect('/auth/login');

  const isPatientProfile = await getPatientProfile(session.user.id);
  const appointments = await getPatientAppointments(session.user.id);
  const stats = await patientStats(session.user.id);
  const notifications = await getUserNotifications(session.user.id);

  const recentNotifications = notifications.slice(0, 4);

  // Find single next upcoming appointment
  const upcomingItems = appointments
    .filter(item => isFuture(item.scheduledAt))
    .sort((a, b) => compareAsc(a.scheduledAt, b.scheduledAt));

  const nextAppointment = upcomingItems[0] ?? null;

  return (
    <div>
      <DashboardCard username={session.user.name} />

      {!isPatientProfile ? (
        <PatientOnboarding userId={session.user.id} />
      ) : (
        <>
          {/* Stats */}
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

          {/* Main Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>

            {/* ── Next Upcoming Appointment ───────────────────────────── */}
            <div className='bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden'>
              <div className='flex justify-between items-center border-b border-slate-100 px-5 py-4'>
                <div className='flex items-center gap-2'>
                  <CalendarIcon className='w-4 h-4 text-text-soft' />
                  <h3 className='text-sm font-bold text-text-base'>Next Appointment</h3>
                </div>
                <Link
                  href='/patient/appointment'
                  className='text-xs font-semibold text-accent-primary hover:underline flex items-center gap-1 transition-colors'
                >
                  View all
                  <ArrowRightIcon className='size-3.5' />
                </Link>
              </div>

              <div className='p-5'>
                {nextAppointment ? (
                  <PatientAppointmentCard
                    appointmentId={nextAppointment.id}
                    doctor={nextAppointment.doctor?.name ?? null}
                    scheduledAt={nextAppointment.scheduledAt}
                    scheduledTime={nextAppointment.scheduledTime}
                    appointmentType={nextAppointment.appointmentType}
                    appointmentReason={nextAppointment.appointmentReason}
                    intakeFormId={nextAppointment.intakeForm?.id ?? null}
                    status={nextAppointment.status ?? null}
                  />
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div className='w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 flex items-center justify-center mb-3 text-text-soft'>
                      <CalendarOff size={22} />
                    </div>
                    <p className='text-sm font-bold text-text-base mb-1'>No upcoming appointments</p>
                    <p className='text-xs text-text-muted max-w-[180px] leading-relaxed'>
                      You have no scheduled visits. Book one to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Notifications ────────────────────────────────────────── */}
            <div className='bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden'>
              <div className='flex justify-between items-center border-b border-slate-100 px-5 py-4'>
                <div className='flex items-center gap-2'>
                  <BellIcon className='w-4 h-4 text-text-soft' />
                  <h3 className='text-sm font-bold text-text-base'>Recent Notifications</h3>
                  {stats.unreadNotifications > 0 && (
                    <span className='inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-black bg-rose-500 text-white rounded-full px-1'>
                      {stats.unreadNotifications}
                    </span>
                  )}
                </div>
                <Link
                  href='/patient/notifications'
                  className='text-xs font-semibold text-accent-primary hover:underline flex items-center gap-1 transition-colors'
                >
                  See all
                  <ArrowRightIcon className='size-3.5' />
                </Link>
              </div>

              <div className='p-5'>
                {recentNotifications.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div className='w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 flex items-center justify-center mb-3 text-text-soft'>
                      <BellIcon size={22} />
                    </div>
                    <p className='text-sm font-bold text-text-base mb-1'>All caught up</p>
                    <p className='text-xs text-text-muted'>No new notifications right now.</p>
                  </div>
                ) : (
                  <ul className='flex flex-col gap-3'>
                    {recentNotifications.map(notification => {
                      let IconComponent = BellIcon;
                      let iconColor = 'text-slate-500 bg-slate-50 border-slate-100';

                      if (notification.type === 'APPOINTMENT') {
                        IconComponent = CalendarIcon;
                        iconColor = 'text-blue-600 bg-blue-50 border-blue-100';
                      } else if (notification.type === 'MESSAGE') {
                        IconComponent = MessageSquareIcon;
                        iconColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                      } else if (notification.type === 'FOLLOW_UP') {
                        IconComponent = ClockIcon;
                        iconColor = 'text-amber-600 bg-amber-50 border-amber-100';
                      } else if (notification.type === 'CLINICAL_NOTE') {
                        IconComponent = FileTextIcon;
                        iconColor = 'text-indigo-600 bg-indigo-50 border-indigo-100';
                      }

                      return (
                        <li
                          key={notification.id}
                          className={cn(
                            'rounded-xl border p-3.5 transition-all hover:bg-slate-50/60',
                            notification.isRead ? 'border-slate-100' : 'border-blue-100 bg-blue-50/20',
                          )}
                        >
                          <Link
                            href='/patient/notifications'
                            className='flex gap-3 items-start cursor-pointer w-full'
                          >
                            <div className={cn('p-2 rounded-xl shrink-0 border', iconColor)}>
                              <IconComponent className='w-3.5 h-3.5' />
                            </div>
                            <div className='flex-1 min-w-0 space-y-0.5'>
                              <div className='flex items-center justify-between gap-2'>
                                <p className='text-xs font-bold text-text-base truncate'>
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <span className='shrink-0 w-2 h-2 rounded-full bg-blue-500' />
                                )}
                              </div>
                              <p className='text-xs text-text-muted line-clamp-2 leading-relaxed'>
                                {notification.message}
                              </p>
                              <span className='text-[10px] text-text-soft font-semibold block pt-0.5'>
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
        </>
      )}
    </div>
  );
};

export default PatientDashboardPage;
