import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppointmentStatus, RiskLevel } from '@/generated/prisma/enums';

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

export const formatEnums = (str: string) => {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function getAppointmentStatusStyle(status: AppointmentStatus): string {
  switch (status) {
    case AppointmentStatus.PENDING_INTAKE:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case AppointmentStatus.READY_FOR_REVIEW:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case AppointmentStatus.ASSIGNED:
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case AppointmentStatus.IN_PROGRESS:
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case AppointmentStatus.NOTES_GENERATED:
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case AppointmentStatus.COMPLETED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case AppointmentStatus.CANCELLED:
      return 'bg-slate-50 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export function getRiskLevelStyle(risk: RiskLevel): string {
  switch (risk) {
    case RiskLevel.LOW:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case RiskLevel.MEDIUM:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case RiskLevel.HIGH:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export const getAge = (dateString?: string | Date | null) => {
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return 0;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case "LOW":
      return "bg-slate-50 text-slate-700 border-slate-200/60";
    case "MEDIUM":
      return "bg-blue-50 text-blue-700 border-blue-200/60";
    case "HIGH":
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    case "CRITICAL":
      return "bg-rose-50 text-rose-700 border-rose-200/60 animate-pulse";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200/60";
  }
}