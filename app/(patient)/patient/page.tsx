import { redirect } from 'next/navigation';

const PatientPage = () => {
  return redirect('/patient/dashboard');
};

export default PatientPage;
