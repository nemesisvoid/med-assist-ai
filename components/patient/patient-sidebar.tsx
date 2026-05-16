'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { patientSidebarLinks } from '@/constants';
const PatientSidebar = ({ unread }: { unread: number }) => {
  const pathname = usePathname();
  const { state } = useSidebar();
  console.log(unread, 'unread');

  return (
    <Sidebar
      collapsible='icon'
      className='backdrop-blur-sm mr-10'>
      <SidebarContent className='mt-1 px-3 py-4 bg-white '>
        <SidebarHeader className='px-2 pb-2'>
          <div className='flex items-center justify-center gap-2'>
            <Image
              src='/'
              alt='logo'
              width={100}
              height={100}
            />
          </div>
        </SidebarHeader>

        <SidebarMenu>
          {patientSidebarLinks.map(item => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <SidebarMenuItem
                key={item.name}
                className='mb-2'>
                <SidebarMenuButton className={`text-text-muted text-base  rounded-sm py-5 ${isActive ? 'bg-accent-primary/20 ' : ''}`}>
                  <Link
                    href={item.href}
                    title={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 px-0 py-4 transition-all' ${isActive ? 'text-accent-primary' : ''}`}>
                    <span>
                      <item.icon className='size-4' />
                    </span>
                    <span className={isActive ? '' : ''}>{item.name}</span>
                    {unread && item.name.includes('Notifications') ? (
                      <span className='text-white text-sm font-semibold bg-red-500 rounded-full h-5 w-5 flex items-center justify-center mr-auto'>
                        {unread}
                      </span>
                    ) : null}
                    {/* 
                    {isActive && <span className='absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-white/70' />} */}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default PatientSidebar;
