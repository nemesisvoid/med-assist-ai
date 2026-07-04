'use client';

import { NotificationType } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from '@/actions/notification.action';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTransition, useState, Fragment } from 'react';
import Link from 'next/link';

// ─── Icon map by notification type ───────────────────────────────────────────

const NotificationIcon = ({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) => {
  const base = cn('w-5 h-5 shrink-0', className);
  switch (type) {
    case NotificationType.APPOINTMENT:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case NotificationType.MESSAGE:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case NotificationType.FOLLOW_UP:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      );
    case NotificationType.CLINICAL_NOTE:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case NotificationType.INTAKE_FORM:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case NotificationType.SYSTEM:
    default:
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
};

// ─── Type visual config ───────────────────────────────────────────────────────

const typeConfig: Record<
  NotificationType,
  { label: string; iconBg: string; iconColor: string; badgeBg: string; badgeText: string }
> = {
  APPOINTMENT: {
    label: 'Appointment',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
  },
  MESSAGE: {
    label: 'Message',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
  },
  FOLLOW_UP: {
    label: 'Follow-up',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
  },
  CLINICAL_NOTE: {
    label: 'Clinical Note',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  INTAKE_FORM: {
    label: 'Intake Form',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
  },
  SYSTEM: {
    label: 'System',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-600',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  type: NotificationType;
  message: string;
  title: string;
  link: string | null;
  id: string;
  isRead: boolean;
  createdAt: Date;
};

export type NotificationsProps = {
  notification: NotificationItem[];
  unread: number;
  userId: string;
  /** Route prefix used for cache revalidation — e.g. '/doctor' or '/patient' */
  pathPrefix?: string;
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
      <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-700">All caught up</p>
      <p className="text-xs text-slate-400 mt-0.5">No notifications to display</p>
    </div>
  </div>
);

const NotificationRow = ({
  item,
  config,
  pathPrefix,
}: {
  item: NotificationItem;
  config: (typeof typeConfig)[NotificationType];
  pathPrefix: string;
}) => {
  const [open, setOpen] = useState(false);
  const [, startLocalTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Fire-and-forget inside its own isolated transition — never touches parent state
    if (next && !item.isRead) {
      startLocalTransition(async () => {
        await markNotificationAsRead(item.id, pathPrefix);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Base UI DialogTrigger renders as a plain button — no asChild needed */}
      <DialogTrigger className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl">
        <div className="flex items-start gap-4 w-full">
          {/* Icon bubble */}
          <div className={cn('mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.iconBg)}>
            <NotificationIcon type={item.type} className={config.iconColor} />
          </div>

          {/* Body text */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-sm font-semibold truncate text-text-base', !item.isRead && 'text-slate-900')}>
                {item.title}
              </p>
              {!item.isRead && (
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-text-soft mt-1 line-clamp-2 leading-relaxed">{item.message}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md', config.badgeBg, config.badgeText)}>
                {config.label}
              </span>
              <span className="text-[11px] text-text-soft">
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Unread dot */}
          {!item.isRead && (
            <div className="mt-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
            </div>
          )}
        </div>
      </DialogTrigger>

      {/* ── Detail dialog ── */}
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-border-subtle shadow-xl">
        {/* Coloured header band */}
        <div className={cn('px-6 pt-6 pb-5 border-b border-slate-100', config.iconBg)}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/70 shadow-sm">
                <NotificationIcon type={item.type} className={cn('w-6 h-6', config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {item.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md', config.badgeBg, config.badgeText)}>
                    {config.label}
                  </span>
                  {!item.isRead && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Unread
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{item.message}</p>

          {item.link && (
            <Link
              href={item.link}
              className={cn(
                'flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5',
                'text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90',
                config.iconBg.replace('bg-', 'bg-').replace('-50', '-600'),
              )}
            >
              View details
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}

          {/* Metadata strip */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Received</span>
              <span className="text-xs font-semibold text-slate-700">
                {format(item.createdAt, 'MMM d, yyyy · h:mm a')}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Status</span>
              <span className={cn('text-xs font-bold', item.isRead ? 'text-slate-400' : 'text-blue-600')}>
                {item.isRead ? 'Read' : 'Unread'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Category</span>
              <span className={cn('text-xs font-semibold', config.iconColor)}>{config.label}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────

const Notifications = ({
  notification,
  unread,
  userId,
  pathPrefix = '/doctor',
}: NotificationsProps) => {
  const [isPending, startTransition] = useTransition();


  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead(userId, pathPrefix);
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      await clearAllNotifications(userId, pathPrefix);
    });
  };

  return (
    <div className="w-full max-w-3xl">
      {/* ── Header bar ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-medium text-text-base tracking-tight">Inbox</h3>
          <p className="text-sm text-text-soft mt-0.5">
            {unread > 0 ? (
              <>
                <span className="font-semibold text-blue-600">{unread}</span>{' '}
                unread notification{unread !== 1 ? 's' : ''}
              </>
            ) : (
              'All caught up — no unread notifications'
            )}
          </p>
        </div>

        {notification.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold rounded-lg cursor-pointer"
              >
                Mark all read
              </Button>
            )}

            {/* Clear all — guarded by confirmation dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="text-xs h-8 px-3 text-slate-500 hover:bg-red-50 hover:text-red-600 font-semibold rounded-lg cursor-pointer"
                >
                  Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {notification.length} notification
                    {notification.length !== 1 ? 's' : ''} in your inbox. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* ── List ── */}
      {notification.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border-subtle">
          <EmptyState />
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list" aria-label="Notifications">
          {notification.map((item, idx) => {
            const config = typeConfig[item.type] ?? typeConfig.SYSTEM;
            // Insert "Earlier" divider at the first read item after unread ones
            const isFirstRead = item.isRead && idx > 0 && !notification[idx - 1].isRead;

            return (
              <Fragment key={item.id}>
                {isFirstRead && (
                  <li className="flex items-center gap-3 py-2" role="separator">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                      Earlier
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </li>
                )}
                <li
                  className={cn(
                    'rounded-2xl border px-5 py-4 transition-all duration-200',
                    item.isRead
                      ? 'bg-white border-border-subtle hover:border-slate-300 hover:shadow-sm'
                      : 'bg-white border-blue-200 shadow-sm shadow-blue-50 hover:border-blue-300 hover:shadow-blue-100',
                  )}
                >
                  <NotificationRow
                    item={item}
                    config={config}
                    pathPrefix={pathPrefix}
                  />
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      {/* ── Footer count ── */}
      {notification.length > 0 && (
        <p className="text-center text-xs text-slate-400 mt-6">
          {notification.length} notification{notification.length !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
};

export default Notifications;
