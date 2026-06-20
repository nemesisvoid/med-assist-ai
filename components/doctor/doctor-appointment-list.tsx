import { AppointmentStatus, RiskLevel } from '@/generated/prisma/enums';
import DoctorAppointmentCard from './doctor-appointment-card';

type DoctorAppointmentListProp = {
  data: {
    appointmentId: string;
    appointmentType: string;
    scheduledDate: Date;
    scheduledTime: string;
    appointmentReason: string;
    intakeFormId: string | undefined;
    title: string | null;
    patientName: string;
    riskLevel: RiskLevel;
    status: AppointmentStatus;
  }[];
};

const DoctorAppointmentList = ({ data }: DoctorAppointmentListProp) => {
  console.log('data here', data);
  return (
    <div className='flex flex-col gap-4'>
      {data.map(item => (
        <DoctorAppointmentCard
          key={item.appointmentId}
          data={item}
        />
      ))}
    </div>
  );
};

export default DoctorAppointmentList;
