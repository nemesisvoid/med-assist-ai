'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type CreateNotificationInput = {
  userId: string;
  type: 'INTAKE_FORM' | 'APPOINTMENT' | 'SYSTEM' | 'FOLLOW_UP' | 'CLINICAL_NOTE' | 'MESSAGE';
  title: string;
  message: string;
};

export const createNotification = async ({ userId, type, title, message }: CreateNotificationInput) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });
  } catch (error) {
    console.error('Failed to dispatch background application notification:', error);

    return null;
  }
};

export const markNotificationAsRead = async (notificationId: string, param: string) => {
  await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });
  revalidatePath(`${param}/notification`);
};

export const markAllNotificationsAsRead = async (userId: string, param: string) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
  revalidatePath(`${param}/notification`);
};

export const clearAllNotifications = async (userId: string, param: string) => {
  await prisma.notification.deleteMany({
    where: {
      userId,
    },
  });
  revalidatePath(`${param}/notification`);
};
