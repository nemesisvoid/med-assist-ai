import PatientProfileForm from '@/components/patient/patient-profile-form';

import { AlertCircleIcon, UserCircleIcon } from 'lucide-react';

const PatientOnboarding = ({ userId }: { userId: string }) => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center max-w-2xl mx-auto mt-10 shadow-sm'>
      <div className='bg-blue-50 p-4 rounded-full mb-5'>
        <UserCircleIcon
          className='w-14 h-14 text-blue-600'
          strokeWidth={1.5}
        />
      </div>

      <h2 className='text-2xl font-extrabold text-slate-900 mb-2'>Almost there! Complete your profile</h2>

      <div className='flex items-start gap-2 bg-amber-50 text-amber-800 text-sm p-3 rounded-lg mb-6 max-w-md text-left'>
        <AlertCircleIcon className='w-5 h-5 shrink-0 text-amber-600 mt-0.5' />
        <p>To ensure you receive the best care, you must complete your medical profile before booking appointments or accessing your records.</p>
      </div>

      <PatientProfileForm userId={userId} />
    </div>
  );
};

export default PatientOnboarding;
