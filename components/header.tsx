import { BellIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getCurrentDate } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';

const Header = () => {
  return (
    <div className='bg-bg-canvas flex items-center justify-between px-6 py-3 border-b border-gray-300'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-text-base font-bold'>My Health Dashboard</h2>

        <p className='text-sm text-gray-600'>{getCurrentDate()}</p>
      </div>

      <Link
        href='/patient/appointment/create-appointment'
        className='text-sm text-white font-medium flex items-center gap-2 bg-accent-primary py-3 px-3 hover:bg-accent-hover rounded-sm'>
        <PlusIcon className='text-white size-4.5' />
        Book Appointment
      </Link>
    </div>
  );
};

export default Header;
{
  /* <SearchIcon className='text-text-muted size-4.5' />
        <input
          className=' w-full border-none outline-none py-2 placeholder:text-sm'
          placeholder='Search appointment, notes....'
        /> */
}
