import AppointmentsList from '@/components/appointments-list';

const DoctorAppointmentPage = () => {
  return (
    <div>
      <AppointmentsList
        appointments={data}
        isPatient={session.user.role}
      />
    </div>
  );
};

export default DoctorAppointmentPage;
