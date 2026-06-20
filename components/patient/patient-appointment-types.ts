import { getPatientAppointmentById } from '@/actions/patient.action';
import {
  AlertCircle,
  Activity,
  FileText,
  User,
  HeartPulse,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';

export type Appointment = NonNullable<Awaited<ReturnType<typeof getPatientAppointmentById>>>;
export type AppStatus = Appointment['status'];

export const STATUS_ORDER: Record<AppStatus, number> = {
  PENDING_INTAKE: 0,
  READY_FOR_REVIEW: 1,
  ASSIGNED: 2,
  IN_PROGRESS: 3,
  NOTES_GENERATED: 4,
  COMPLETED: 5,
  CANCELLED: -1,
};

export const LIFECYCLE_STEPS: {
  key: AppStatus;
  label: string;
  patientLabel: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'PENDING_INTAKE',
    label: 'Intake Required',
    patientLabel: 'Please complete your intake form',
    icon: ClipboardList,
  },
  {
    key: 'READY_FOR_REVIEW',
    label: 'Under Review',
    patientLabel: 'Your case is being reviewed by our team',
    icon: FileText,
  },
  {
    key: 'ASSIGNED',
    label: 'Doctor Assigned',
    patientLabel: 'A doctor has been assigned to your case',
    icon: User,
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Consultation',
    patientLabel: 'Your consultation is actively in progress',
    icon: HeartPulse,
  },
  {
    key: 'NOTES_GENERATED',
    label: 'Notes Being Prepared',
    patientLabel: 'Your clinical notes are being finalized',
    icon: FileText,
  },
  {
    key: 'COMPLETED',
    label: 'Visit Complete',
    patientLabel: 'Your appointment has been completed',
    icon: CheckCircle2,
  },
];

export function getLiveStatusConfig(status: AppStatus) {
  switch (status) {
    case 'PENDING_INTAKE':
      return {
        color: 'amber',
        icon: AlertCircle,
        title: 'Action Required',
        message: 'Please complete your pre-appointment intake form so your doctor can prepare for your visit.',
        pulse: true,
      };
    case 'READY_FOR_REVIEW':
      return {
        color: 'blue',
        icon: FileText,
        title: 'Case Under Review',
        message: 'Our medical team is currently reviewing your intake information and preparing your case.',
        pulse: false,
      };
    case 'ASSIGNED':
      return {
        color: 'indigo',
        icon: User,
        title: 'Doctor Assigned',
        message: 'A doctor has been assigned to your appointment and will begin your consultation shortly.',
        pulse: false,
      };
    case 'IN_PROGRESS':
      return {
        color: 'sky',
        icon: HeartPulse,
        title: 'Consultation In Progress',
        message: 'Your doctor is actively working on your consultation. Clinical notes are being prepared.',
        pulse: true,
      };
    case 'NOTES_GENERATED':
      return {
        color: 'violet',
        icon: FileText,
        title: 'Finalizing Your Visit',
        message: 'Your doctor is reviewing and finalizing your clinical notes and treatment plan.',
        pulse: true,
      };
    case 'CANCELLED':
      return {
        color: 'slate',
        icon: AlertCircle,
        title: 'Appointment Cancelled',
        message: 'This appointment has been cancelled. Please contact support if you need assistance.',
        pulse: false,
      };
    default:
      return {
        color: 'slate',
        icon: Activity,
        title: 'Processing',
        message: 'Your appointment is being processed.',
        pulse: false,
      };
  }
}
