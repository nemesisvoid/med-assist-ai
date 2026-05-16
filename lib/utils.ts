import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const greet = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good Morning';
  } else if (hour < 18) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
};

export const getCurrentDate = () => {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date());
};

export const generateMedicalRecordNumber = () => {
  const random = Math.floor(Math.random() * 1000000);
  return `MRN-${random.toString().padStart(6, '0')}`;
};
