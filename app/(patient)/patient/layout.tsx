import { getUserNotifications } from '@/actions/patient.action';
import Header from '@/components/header';
import PatientSidebar from '@/components/patient/patient-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import IncomingCallListener from '@/components/video/incoming-call-listener';

const PatientLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getLoggedInUser();
  if (!session) return redirect('/auth/login');
  const getUnreadNotifications = await getUserNotifications();

  const unread = getUnreadNotifications.filter(item => !item.isRead).length;
  return (
    <SidebarProvider>
      <PatientSidebar unread={unread} />
      <main className='overflow-x-hidden bg-bg-surface w-full h-full'>
        <Header />
        <IncomingCallListener userId={session.user.id} />
        <div className='min-h-screen mx-10 my-6'>{children}</div>
      </main>
    </SidebarProvider>
  );
};

export default PatientLayout;
