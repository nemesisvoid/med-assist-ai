import { getUserNotifications } from '@/actions/patient.action';
import DoctorSidebar from '@/components/doctor/doctor-sidebar';
import Header from '@/components/header';

import { SidebarProvider } from '@/components/ui/sidebar';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

const DoctorLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');
  const getUnreadNotifications = await getUserNotifications(session.user.id);

  const unread = getUnreadNotifications.filter(item => !item.isRead).length;
  return (
    <SidebarProvider>
      <DoctorSidebar unread={unread} />
      <main className='overflow-x-hidden bg-bg-surface w-full h-full'>
        <Header />
        <div className='min-h-screen mx-10 my-6'>{children}</div>
      </main>
    </SidebarProvider>
  );
};

export default DoctorLayout;
