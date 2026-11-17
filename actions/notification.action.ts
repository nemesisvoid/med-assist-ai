'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSessionWithRole } from '@/lib/authz';

// Every action acts only on the signed-in user's own notifications.

const notificationPath = (role?: string | null) => `/${(role ?? "patient").toLowerCase()}/notification`;

export const markNotificationAsRead = async (notificationId: string) => {
  const session = await getSessionWithRole();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath(notificationPath(session.user.role));
};

export const markAllNotificationsAsRead = async () => {
  const session = await getSessionWithRole();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath(notificationPath(session.user.role));
};

export const clearAllNotifications = async () => {
  const session = await getSessionWithRole();
  if (!session) return;
  await prisma.notification.deleteMany({ where: { userId: session.user.id } });
  revalidatePath(notificationPath(session.user.role));
};
