'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { doctorSidebarLinks } from '@/constants';
import { MedAssistLogo } from '../med-assist-logo';

const DoctorSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/auth/login');
        },
      },
    });
  };

  return (
    <Sidebar
      collapsible='icon'
      className='border-r border-slate-100 bg-white'>
      <SidebarHeader
        className={
          isCollapsed ? 'p-2 flex justify-center items-center h-16' : 'px-6 h-16 flex items-center justify-between border-b border-slate-50 mb-4'
        }>
        <MedAssistLogo isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <span className='bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase border border-blue-100'>
            MD
          </span>
        )}
      </SidebarHeader>

      <SidebarContent className='px-3 bg-white'>
        <SidebarMenu className='gap-1'>
          {doctorSidebarLinks.map(item => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  className={`w-full py-5.5 rounded-md transition-all ${
                    isActive
                      ? 'bg-blue-50/60 text-blue-600 font-semibold hover:bg-blue-50/80 hover:text-blue-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className='flex items-center gap-3.5 w-full'>
                    <item.icon className={`size-[18px] shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className='text-[14px]'>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='p-3 border-t border-slate-50 bg-white'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className='w-full py-5.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-colors'>
              <div className='flex items-center gap-3.5 w-full'>
                <LogOut className='size-[18px] text-slate-400 group-hover:text-red-500 shrink-0' />
                <span className='text-[14px] font-medium'>Sign Out</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DoctorSidebar;
