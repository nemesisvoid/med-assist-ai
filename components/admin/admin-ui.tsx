import Link from 'next/link';
import { cn, formatEnums, getAppointmentStatusStyle, getPriorityStyle } from '@/lib/utils';
import type { AppointmentPriority, AppointmentStatus, DoctorAvailabilityStatus, Role } from '@/generated/prisma/enums';
import { BanIcon, CheckCircle2Icon, CircleDashedIcon, MailWarningIcon } from 'lucide-react';

// ─── Layout ────────────────────────────────────────────────────────────────────

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) => (
  <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
    <div className='space-y-1'>
      <h1 className='text-2xl font-extrabold tracking-tight text-slate-900'>{title}</h1>
      {description && <p className='max-w-2xl text-sm text-slate-500'>{description}</p>}
    </div>
    {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
  </div>
);

export const Panel = ({
  title,
  description,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section className={cn('flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm', className)}>
    <header className='flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4'>
      <div className='flex items-start gap-2.5'>
        {icon && <span className='mt-0.5 text-slate-400'>{icon}</span>}
        <div>
          <h2 className='text-sm font-bold text-slate-800'>{title}</h2>
          {description && <p className='mt-0.5 text-xs text-slate-500'>{description}</p>}
        </div>
      </div>
      {action}
    </header>
    <div className={cn('flex-1', bodyClassName)}>{children}</div>
  </section>
);

export const PanelLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className='shrink-0 rounded-md text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
    {children}
  </Link>
);

export const EmptyState = ({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) => (
  <div className='flex flex-col items-center justify-center px-6 py-14 text-center'>
    <div className='mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400'>{icon}</div>
    <p className='text-sm font-bold text-slate-700'>{title}</p>
    {description && <p className='mt-1 max-w-xs text-xs leading-relaxed text-slate-500'>{description}</p>}
    {action && <div className='mt-4'>{action}</div>}
  </div>
);

// ─── Identity ──────────────────────────────────────────────────────────────────

export const getInitials = (name?: string | null) =>
  (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const UserAvatar = ({ name, image, size = 'md' }: { name: string; image?: string | null; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'size-7 text-[10px]', md: 'size-9 text-xs', lg: 'size-14 text-base' };
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=''
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size])}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 ring-2 ring-white', sizes[size])}>
      {getInitials(name)}
    </span>
  );
};

export const UserIdentity = ({ name, email, image, href }: { name: string; email?: string; image?: string | null; href?: string }) => {
  const content = (
    <div className='flex min-w-0 items-center gap-3'>
      <UserAvatar
        name={name}
        image={image}
      />
      <div className='min-w-0'>
        <p className={cn('truncate text-sm font-semibold text-slate-800', href && 'group-hover:text-blue-600')}>{name}</p>
        {email && <p className='truncate text-xs text-slate-500'>{email}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className='group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
      {content}
    </Link>
  ) : (
    content
  );
};

// ─── Badges ────────────────────────────────────────────────────────────────────

const pill = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold';

const roleStyles: Record<Role, string> = {
  PATIENT: 'bg-sky-50 text-sky-700 border-sky-200',
  DOCTOR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ADMIN: 'bg-slate-900 text-white border-slate-900',
};

export const RoleBadge = ({ role }: { role: Role }) => <span className={cn(pill, roleStyles[role])}>{formatEnums(role.toLowerCase())}</span>;

export const AccountStatusBadge = ({ banned, emailVerified, invitePending }: { banned: boolean; emailVerified?: boolean; invitePending?: boolean }) => {
  if (banned)
    return (
      <span className={cn(pill, 'border-rose-200 bg-rose-50 text-rose-700')}>
        <BanIcon
          className='size-3'
          aria-hidden
        />
        Suspended
      </span>
    );
  if (invitePending)
    return (
      <span className={cn(pill, 'border-amber-200 bg-amber-50 text-amber-700')}>
        <CircleDashedIcon
          className='size-3'
          aria-hidden
        />
        Invite pending
      </span>
    );
  if (emailVerified === false)
    return (
      <span className={cn(pill, 'border-amber-200 bg-amber-50 text-amber-700')}>
        <MailWarningIcon
          className='size-3'
          aria-hidden
        />
        Unverified
      </span>
    );
  return (
    <span className={cn(pill, 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
      <CheckCircle2Icon
        className='size-3'
        aria-hidden
      />
      Active
    </span>
  );
};

const availabilityStyles: Record<DoctorAvailabilityStatus, { dot: string; label: string }> = {
  AVAILABLE: { dot: 'bg-emerald-500', label: 'Available' },
  BUSY: { dot: 'bg-amber-500', label: 'Busy' },
  OFFLINE: { dot: 'bg-slate-400', label: 'Offline' },
  ON_LEAVE: { dot: 'bg-violet-500', label: 'On leave' },
};

export const AvailabilityBadge = ({ status }: { status: DoctorAvailabilityStatus }) => (
  <span className={cn(pill, 'border-slate-200 bg-white text-slate-700')}>
    <span
      aria-hidden
      className={cn('size-1.5 rounded-full', availabilityStyles[status].dot)}
    />
    {availabilityStyles[status].label}
  </span>
);

export const availabilityLabel = (status: DoctorAvailabilityStatus) => availabilityStyles[status].label;

export const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => (
  <span className={cn(pill, getAppointmentStatusStyle(status))}>{formatEnums(status.toLowerCase())}</span>
);

export const PriorityBadge = ({ priority }: { priority: AppointmentPriority }) => (
  <span className={cn(pill, getPriorityStyle(priority).replace('animate-pulse', ''))}>{formatEnums(priority.toLowerCase())}</span>
);

// ─── Formatting ────────────────────────────────────────────────────────────────

export const formatDate = (date: Date | string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date));
export const formatDateTime = (date: Date | string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

/** Coarse, human-readable device label from a user agent (no fingerprinting detail). */
export function describeUserAgent(ua?: string | null) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return `${browser} on ${os}`;
}
