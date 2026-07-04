import { BellIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getCurrentDate } from '@/lib/utils';
import Link from 'next/link';
import { getLoggedInUser } from '@/lib/get-user';
import { getUserNotifications } from '@/actions/patient.action';

const Header = async () => {
  const session = await getLoggedInUser();
  const user = session?.user;
  const role = user?.role || 'PATIENT';

  let unread = 0;
  if (user) {
    try {
      const notifications = await getUserNotifications(user.id);
      unread = notifications.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex items-center justify-between px-4 sm:px-8 py-3.5 transition-all duration-300">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2 text-slate-500 hover:text-slate-800" />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
            {role === 'PATIENT' ? 'My Health Dashboard' : 'Provider Dashboard'}
          </h2>
          <p className="text-sm font-semibold text-slate-500 hidden sm:block">{getCurrentDate()}</p>
        </div>
      </div>

      <div className="flex items-center gap-5 sm:gap-6">
        <div className="relative hidden md:flex items-center">
          <SearchIcon className="absolute left-3.5 size-4.5 text-slate-400" strokeWidth={2.5} />
          <Input 
            placeholder={role === 'PATIENT' ? "Search doctors, appointments..." : "Search patients, MRN..."} 
            className="w-64 pl-10 h-10 bg-slate-50/80 border-slate-200/80 text-sm font-medium rounded-full focus-visible:ring-blue-500 focus-visible:bg-white transition-all shadow-inner"
          />
        </div>

        {role === 'PATIENT' && (
          <Link
            href="/patient/appointment/create-appointment"
            className="hidden sm:flex text-sm text-white font-bold items-center gap-2 bg-blue-600 py-2.5 px-4.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all rounded-full"
          >
            <PlusIcon className="text-white size-4.5" strokeWidth={3} />
            Book Appointment
          </Link>
        )}

        <div className="flex items-center gap-4 sm:gap-5 border-l border-slate-200 pl-5 sm:pl-6">
          <Link 
            href={role === 'PATIENT' ? '/patient/notification' : '/doctor/notification'} 
            className="relative p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors active:scale-95"
          >
            <BellIcon className="size-5.5" strokeWidth={2.5} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm animate-in zoom-in-50">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none focus:outline-none">
              <div className="flex items-center gap-3.5 cursor-pointer group outline-none">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 max-w-[120px]">
                    {user?.name || 'Guest User'}
                  </p>
                  <p className="text-xs font-bold text-slate-500 capitalize tracking-wide">
                    {role.toLowerCase()}
                  </p>
                </div>
                <Avatar className="size-11 border-[2.5px] border-white shadow-sm ring-2 ring-slate-100/80 transition-transform duration-300 group-hover:scale-105 group-hover:ring-blue-100">
                  <AvatarImage src={user?.image || ''} alt={user?.name || 'User Avatar'} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 font-black text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-medium border-slate-100 rounded-xl shadow-lg mt-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-bold text-slate-800">My Account</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-50 hover:text-blue-600 rounded-lg p-0">
                <Link href={role === 'PATIENT' ? '/patient/profile' : '/doctor/profile'} className="w-full h-full flex items-center px-2 py-1.5">
                  Profile Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
