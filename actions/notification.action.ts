import { prisma } from '@/lib/prisma';

type CreateNotificationInput = {
  userId: string;
  type: 'INTAKE_FORM' | 'APPOINTMENT' | 'SYSTEM'; // Adjust based on your schema's enum
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
