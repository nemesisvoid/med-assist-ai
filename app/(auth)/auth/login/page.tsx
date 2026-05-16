import AuthForm from '@/components/auth-form';
import { HeartIcon, ShieldIcon, StarsIcon } from 'lucide-react';

const LoginPage = () => {
  return (
    <main className='grid grid-cols-2 min-h-screen'>
      <div className='flex flex-col gap-4 login-card-gradient  relative overflow-hidden p-20 top-right-circle bottom-circle'>
        <span
          className='mid-circle'
          aria-hidden
        />
        <div className='mb-25'>
          <h1 className='text-white text-2xl font-bold'>MedAssist AI</h1>
          <p className='text-text-muted text-xs uppercase font-medium'>Patient Portal</p>
        </div>

        <div>
          <h3 className='text-sm text-[#93c5fd] font-medium bg-[#1677ff33] flex items-center gap-2 w-fit rounded-xl px-3 py-1 border border-[#1677ff59] mb-4'>
            <StarsIcon className='size-4' />
            AI-Powered TeleHealth
          </h3>

          <div className='mb-8'>
            <h2 className='text-white text-3xl font-bold mb-4'>
              Your health, <br /> expertly managed.
            </h2>
            <p className='text-sm text-white/60'>
              Book appointments, receive AI-assisted clinical notes, and stay connected with your care <br /> team — all in one secure place.
            </p>
          </div>

          <div className='flex flex-col gap-4'>
            <div className='flex items-center gap-3'>
              <ShieldIcon className='text-white size-5' />
              <p className='text-white/80 text-sm'>Secure & HIPAA-compliant data protection</p>
            </div>

            <div className='flex items-center gap-3'>
              <StarsIcon className='text-white size-5' />
              <p className='text-white/80 text-sm'>AI risk analysis on every appointment</p>
            </div>

            <div className='flex items-center gap-3'>
              <HeartIcon className='text-white size-5' />
              <p className='text-white/80 text-sm'>Personalized, continuous health tracking</p>
            </div>
          </div>
        </div>
      </div>

      <div className='bg-accent-soft'>
        <AuthForm />
      </div>
    </main>
  );
};

export default LoginPage;
