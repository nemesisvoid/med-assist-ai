import { greet } from '@/lib/utils';

type DashboardCardTypeProps = {
  appointmentDate?: Date;
  username: string;
};

const DashboardCard = ({ appointmentDate, username }: DashboardCardTypeProps) => {
  return (
    <div className='dashboard-card-gradient px-6 py-5 h-38 rounded-xl'>
      <div className='flex flex-col gap-2'>
        <p className='text-base text-text-soft'>{greet()},</p>
        <p className='text-white text-2xl font-semibold'>{username}</p>
        <p className='text-sm text-text-soft'>You have an appointment today at 3:30 PM</p>
      </div>
    </div>
  );
};

export default DashboardCard;
