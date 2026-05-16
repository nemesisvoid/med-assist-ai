'use client';
import { isFuture, isPast } from 'date-fns';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AppointmentCard from './patient/appointment-card';

type Appointments = {
  appointmentId: string;
  scheduledAt: Date;
  scheduledTime: string | null;
  doctor?: string | null;
  appointmentReason: string;
  appointmentType: string;
  intakeFormId?: string | null | undefined;
  title: string | null;
};

type PatientAppointmentsListProps = {
  appointments: Appointments[];
  isPatient: 'PATIENT' | 'DOCTOR';
  isCard?: boolean;
};
const AppointmentsList = ({ appointments, isPatient, isCard = false }: PatientAppointmentsListProps) => {
  if (appointments.length === 0)
    return <div className='text-lg font-medium flex items-center justify-center h-50'>You do not have any appointments</div>;
  const isPastAppointments = appointments.filter(item => isPast(item.scheduledAt));
  const upcomingAppointments = appointments.filter(item => isFuture(item.scheduledAt));
  console.log(appointments);
  console.log(upcomingAppointments);
  return isCard ? (
    <div className='flex flex-col gap-4'>
      {upcomingAppointments.map(item => (
        <AppointmentCard
          appointmentId={item.appointmentId}
          title={item.appointmentType}
          scheduledDate={item.scheduledAt}
          scheduledTime={item.scheduledTime}
          doctor={item.doctor}
          key={item.appointmentId}
          isPatient={isPatient}
          date={item.scheduledAt}
          intakeFormId={item.intakeFormId}
        />
      ))}
    </div>
  ) : (
    <div>
      <div>
        <Tabs
          defaultValue='upcoming'
          className='w-1/2'>
          <TabsList className='px-2 bg-accent-soft border border-accent-secondary-soft'>
            <TabsTrigger
              className='text-lg font-medium'
              value='upcoming'>
              Upcoming
            </TabsTrigger>

            <TabsTrigger
              className='text-lg font-medium'
              value='past'>
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value='upcoming'>
            <div className='flex flex-col gap-4'>
              {upcomingAppointments.map(item => (
                <AppointmentCard
                  appointmentId={item.appointmentId}
                  title={item.appointmentType}
                  scheduledDate={item.scheduledAt}
                  scheduledTime={item.scheduledTime}
                  doctor={item.doctor}
                  key={item.appointmentId}
                  isPatient={isPatient}
                  date={item.scheduledAt}
                  intakeFormId={item.intakeFormId}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value='past'>
            <div className='flex flex-col gap-4'>
              {isPastAppointments.map(item => (
                <AppointmentCard
                  key={item.appointmentId}
                  isPatient={isPatient}
                  date={item.scheduledAt}
                  intakeFormId={item.intakeFormId}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AppointmentsList;
