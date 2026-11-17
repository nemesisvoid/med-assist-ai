/**
 * Creates in-app notifications. A plain server module (not 'use server'), so
 * it can only be called by trusted server code, never directly by a browser.
 */

import { prisma } from '@/lib/prisma';

type CreateNotificationInput = {
  userId: string;
  type: 'INTAKE_FORM' | 'APPOINTMENT' | 'SYSTEM' | 'FOLLOW_UP' | 'CLINICAL_NOTE' | 'MESSAGE';
  title: string;
  message: string;
  link?: string;
};

export async function createNotification({ userId, type, title, message, link }: CreateNotificationInput) {
  try {
    return await prisma.notification.create({ data: { userId, type, title, message, link } });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
