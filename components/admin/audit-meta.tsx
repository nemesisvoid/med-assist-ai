import {
  BanIcon,
  CalendarXIcon,
  EyeIcon,
  VideoIcon,
  PaperclipIcon,
  Trash2Icon,
  KeyRoundIcon,
  LogInIcon,
  LogOutIcon,
  MailPlusIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  ShieldPlusIcon,
  ShuffleIcon,
  StethoscopeIcon,
  UserCheckIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react';
import type { AuditAction } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; icon: LucideIcon; tone: Tone }> = {
  USER_SIGNED_UP: { label: 'Account created', icon: UserPlusIcon, tone: 'success' },
  USER_SIGNED_IN: { label: 'Signed in', icon: LogInIcon, tone: 'neutral' },
  PASSWORD_RESET: { label: 'Password reset', icon: KeyRoundIcon, tone: 'warning' },
  USER_ROLE_CHANGED: { label: 'Role changed', icon: ShieldCheckIcon, tone: 'info' },
  USER_SUSPENDED: { label: 'Account suspended', icon: BanIcon, tone: 'danger' },
  USER_REACTIVATED: { label: 'Account reactivated', icon: UserCheckIcon, tone: 'success' },
  USER_SESSIONS_REVOKED: { label: 'Sessions revoked', icon: LogOutIcon, tone: 'warning' },
  DOCTOR_INVITED: { label: 'Doctor invited', icon: MailPlusIcon, tone: 'info' },
  DOCTOR_INVITE_RESENT: { label: 'Invite resent', icon: RefreshCcwIcon, tone: 'neutral' },
  ADMIN_INVITED: { label: 'Admin invited', icon: ShieldPlusIcon, tone: 'warning' },
  ADMIN_INVITE_RESENT: { label: 'Admin invite resent', icon: RefreshCcwIcon, tone: 'neutral' },
  DOCTOR_AVAILABILITY_CHANGED: { label: 'Availability changed', icon: StethoscopeIcon, tone: 'neutral' },
  APPOINTMENT_REASSIGNED: { label: 'Appointment reassigned', icon: ShuffleIcon, tone: 'info' },
  APPOINTMENT_CANCELLED: { label: 'Appointment cancelled', icon: CalendarXIcon, tone: 'danger' },
  PATIENT_RECORD_VIEWED: { label: 'Patient record viewed', icon: EyeIcon, tone: 'neutral' },
  ATTACHMENT_VIEWED: { label: 'Attachment viewed', icon: PaperclipIcon, tone: 'neutral' },
  MESSAGE_DELETED: { label: 'Message deleted', icon: Trash2Icon, tone: 'warning' },
  VIDEO_CALL_JOINED: { label: 'Video call joined', icon: VideoIcon, tone: 'neutral' },
};

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const AuditActionIcon = ({ action }: { action: AuditAction }) => {
  const { icon: Icon, tone } = AUDIT_ACTION_META[action];
  return (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', toneStyles[tone])}>
      <Icon
        className='size-4'
        aria-hidden
      />
    </span>
  );
};

export const AuditActionBadge = ({ action }: { action: AuditAction }) => {
  const { icon: Icon, tone, label } = AUDIT_ACTION_META[action];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', toneStyles[tone])}>
      <Icon
        className='size-3'
        aria-hidden
      />
      {label}
    </span>
  );
};
