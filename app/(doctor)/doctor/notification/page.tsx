import { getUserNotifications } from '@/actions/patient.action';
import Notifications from '@/components/notifications';
import { getLoggedInUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

const DoctorNotificationPage = async () => {
  const session = await getLoggedInUser();
  if (!session || session.user.role !== 'DOCTOR') return redirect('/auth/login');
  const notifications = await getUserNotifications(session.user.id);
  return (
    <div>
      <h2 className='text-xl font-semibold mb-8'>Notifications</h2>

      <Notifications
        notification={notifications}
        unread={notifications.filter(item => !item.isRead).length}
        userId={session.user.id}
        pathPrefix='/doctor'
      />
    </div>
  );
};

export default DoctorNotificationPage;
