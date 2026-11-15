'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheckIcon } from 'lucide-react';
import { authClient } from '@/lib/auth.client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { adminSidebarSections } from '@/constants';
import { MedAssistLogo } from '../med-assist-logo';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push('/auth/login') },
    });
  };

  return (
    <Sidebar
      collapsible='icon'
      className='border-r border-slate-100 bg-white'>
      <SidebarHeader className={isCollapsed ? 'flex h-16 items-center justify-center p-2' : 'flex h-16 flex-row items-center justify-between border-b border-slate-50 px-6'}>
        <MedAssistLogo isCollapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent className='bg-white px-1 pt-4'>
        {!isCollapsed && (
          <div className='mx-3 mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
            <ShieldCheckIcon
              className='size-4 shrink-0 text-slate-700'
              aria-hidden
            />
            <div className='min-w-0'>
              <p className='text-xs font-bold text-slate-800'>Admin Console</p>
              <p className='truncate text-[11px] text-slate-500'>All actions are audit-logged</p>
            </div>
          </div>
        )}

        {adminSidebarSections.map(section => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className='text-[10.5px] font-bold uppercase tracking-wider text-slate-400'>{section.label}</SidebarGroupLabel>
            <SidebarMenu className='gap-1'>
              {section.links.map(item => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      tooltip={item.name}
                      isActive={isActive}
                      render={
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                        />
                      }
                      className={cn(
                        'h-10 rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-50/70 font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-600 data-active:bg-blue-50/70 data-active:text-blue-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      )}>
                      <item.icon className={cn('size-[18px]! shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                      <span className='text-[14px]'>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className='border-t border-slate-50 bg-white p-3'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip='Sign out'
              onClick={handleSignOut}
              className='h-10 rounded-lg text-slate-500 transition-colors hover:bg-red-50/50 hover:text-red-600'>
              <LogOut className='size-[18px]! shrink-0' />
              <span className='text-[14px] font-medium'>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
