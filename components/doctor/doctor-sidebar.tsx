'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth.client';

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

const DoctorSidebar = ({ unread }: { unread: number }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  console.log('item', doctorSidebarLinks);

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
      {/* Restructured Header with explicit spacing separation */}
      <SidebarHeader
        className={
          isCollapsed ? 'p-2 flex justify-center items-center h-16' : 'px-6 h-16 flex items-center justify-between border-b border-slate-50 mb-2'
        }>
        <MedAssistLogo isCollapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent className='px-3 bg-white pt-8'>
        <SidebarMenu className='gap-1'>
          {doctorSidebarLinks.map(item => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.name}>
                {/* Fixed semantic layout nesting by utilizing standard shadcn asChild parsing */}
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

                    {unread > 0 && item.name.includes('Notifications') && (
                      <span className='ml-auto text-white text-[11px] font-bold bg-blue-600 rounded-full h-5 px-1.5 min-w-5 flex items-center justify-center shadow-sm shadow-blue-500/10 animate-in zoom-in-50'>
                        {unread}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Persistent Bottom Layout Tray for User Platform Management */}
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
