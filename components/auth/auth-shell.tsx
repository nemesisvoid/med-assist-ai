import { HeartIcon, ShieldIcon, StarsIcon } from 'lucide-react';

const features = [
  { icon: ShieldIcon, label: 'Secure & HIPAA-compliant data protection' },
  { icon: StarsIcon, label: 'AI risk analysis on every appointment' },
  { icon: HeartIcon, label: 'Personalized, continuous health tracking' },
];

/** Two-column auth layout: brand panel on the left, the auth step on the right. */
const AuthShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className='grid min-h-dvh grid-cols-1 lg:grid-cols-2'>
      <div className='login-card-gradient top-right-circle bottom-circle relative flex flex-col gap-4 overflow-hidden px-6 py-8 sm:px-10 sm:py-12 lg:p-20'>
        <span
          className='mid-circle'
          aria-hidden
        />
        <div className='mb-4 sm:mb-10 lg:mb-25'>
          <p className='text-xl font-bold text-white sm:text-2xl'>MedAssist AI</p>
          <p className='text-xs font-medium uppercase text-text-muted'>Patient Portal</p>
        </div>

        <div>
          <p className='mb-4 hidden w-fit items-center gap-2 rounded-xl border border-[#1677ff59] bg-[#1677ff33] px-3 py-1 text-sm font-medium text-[#93c5fd] sm:flex'>
            <StarsIcon className='size-4' />
            AI-Powered TeleHealth
          </p>

          <div className='sm:mb-8'>
            <p className='mb-2 text-2xl font-bold text-white sm:mb-4 sm:text-3xl'>
              Your health, <br className='hidden sm:inline' /> expertly managed.
            </p>
            <p className='max-w-md text-sm text-white/60'>
              Book appointments, receive AI-assisted clinical notes, and stay connected with your care team — all in one secure place.
            </p>
          </div>

          <ul className='hidden flex-col gap-4 sm:flex'>
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className='flex items-center gap-3'>
                <Icon
                  className='size-5 shrink-0 text-white'
                  aria-hidden
                />
                <p className='text-sm text-white/80'>{label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className='flex h-full items-start justify-center bg-slate-50 px-4 py-8 sm:items-center sm:px-10 sm:py-12 lg:min-h-dvh'>
        <div className='w-full max-w-95'>{children}</div>
      </div>
    </main>
  );
};

export default AuthShell;
