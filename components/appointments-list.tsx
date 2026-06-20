import { isFuture, isPast } from 'date-fns';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AppointmentCard from './patient/patient-appointment-card';
import { Role, AppointmentStatus, RiskLevel } from '@/generated/prisma/enums';
import DoctorAppointmentCard from './doctor/doctor-appointment-card';

type Appointments = {
  appointmentId: string;
  scheduledAt: Date;
  scheduledTime: string | null;
  appointmentReason: string;
  appointmentType: string;
  intakeFormId?: string | null | undefined;
  title: string | null;
  isCard?: boolean;
};

type PatientAppointment = {
  doctor?: string | null;
  role?: Role;
} & Appointments;

type DoctorAppointment = Appointments & {
  patientName: string;
  riskLevel: RiskLevel;
  status: AppointmentStatus;
  scheduledDate?: Date;
  additionalNotes?: string | null;
  medications?: string | null;
  allergies?: string | null;
  currentSymptoms?: string;
  chiefComplaints?: string;
};

type AppointmentsListProps = {
  appointments: (Appointments | PatientAppointment | DoctorAppointment)[];
  /** Role value from session: 'PATIENT' | 'DOCTOR' */
  role?: Role;
  /** Legacy support for isPatient prop passing role */
  isPatient?: Role;
  isCard?: boolean;
};

const AppointmentsList = ({ appointments, isCard = false, role, isPatient }: AppointmentsListProps) => {
  const activeRole = role || isPatient || 'PATIENT';

  if (appointments.length === 0)
    return <div className='text-lg font-medium flex items-center justify-center h-50'>You do not have any appointments</div>;

  const isPastAppointments = appointments.filter(item => isPast(item.scheduledAt));
  const upcomingAppointments = appointments.filter(item => isFuture(item.scheduledAt));

  const isDoctorAppointment = (a: Appointments | PatientAppointment | DoctorAppointment): a is DoctorAppointment =>
    'patientName' in a && typeof (a as any).patientName !== 'undefined';
  const isPatientAppointment = (a: Appointments | PatientAppointment | DoctorAppointment): a is PatientAppointment =>
    'doctor' in a && typeof (a as any).doctor !== 'undefined';

  return isCard ? (
    <div className='flex flex-col gap-4'>
      {activeRole === 'DOCTOR'
        ? upcomingAppointments.map(item =>
            isDoctorAppointment(item) ? (
              <DoctorAppointmentCard
                key={item.appointmentId}
                data={{
                  appointmentId: item.appointmentId,
                  appointmentType: item.appointmentType,
                  appointmentReason: item.appointmentReason,
                  patientName: item.patientName,
                  scheduledTime: item.scheduledTime,
                  scheduledDate: item.scheduledDate || item.scheduledAt,
                  title: item.title,
                  intakeFormId: item.intakeFormId || undefined,
                  status: item.status || 'PENDING_INTAKE',
                  riskLevel: item.riskLevel || 'LOW',
                }}
              />
            ) : (
              <AppointmentCard
                appointmentId={item.appointmentId}
                title={item.appointmentType}
                scheduledDate={item.scheduledAt}
                scheduledTime={item.scheduledTime}
                doctor={isPatientAppointment(item) ? item.doctor : undefined}
                key={item.appointmentId}
                date={item.scheduledAt}
                intakeFormId={item.intakeFormId}
              />
            ),
          )
        : upcomingAppointments.map(item => (
            <AppointmentCard
              appointmentId={item.appointmentId}
              title={item.appointmentType}
              scheduledDate={item.scheduledAt}
              scheduledTime={item.scheduledTime}
              doctor={isPatientAppointment(item) ? item.doctor : undefined}
              key={item.appointmentId}
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
                  doctor={isPatientAppointment(item) ? item.doctor : undefined}
                  key={item.appointmentId}
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
                  title={item.appointmentType}
                  scheduledDate={item.scheduledAt}
                  scheduledTime={item.scheduledTime}
                  doctor={isPatientAppointment(item) ? item.doctor : undefined}
                  appointmentId={item.appointmentId}
                  key={item.appointmentId}
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
