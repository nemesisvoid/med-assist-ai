import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/admin-sidebar';
import Header from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { requireAdminPage } from '@/lib/authz';

export const metadata: Metadata = {
  title: { default: 'Admin Console · MedAssist AI', template: '%s · MedAssist Admin' },
  robots: { index: false, follow: false },
};

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAdminPage();

  return (
    <SidebarProvider>
      <AdminSidebar />
      <main className='h-full w-full overflow-x-hidden bg-bg-surface'>
        <Header />
        <div className='mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>{children}</div>
      </main>
    </SidebarProvider>
  );
};

export default AdminLayout;
