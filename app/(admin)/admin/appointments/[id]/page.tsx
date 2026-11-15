import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CalendarXIcon,
  CheckIcon,
  CircleIcon,
  ClipboardListIcon,
  HistoryIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  SettingsIcon,
  UserRoundSearchIcon,
  UsersIcon,
} from 'lucide-react';

import {
  AppointmentStatusBadge,
  AvailabilityBadge,
  EmptyState,
  formatDateTime,
  Panel,
  PriorityBadge,
  UserAvatar,
} from '@/components/admin/admin-ui';
import { AuditActionIcon, AUDIT_ACTION_META } from '@/components/admin/audit-meta';
import { AppointmentDetailActions } from '@/components/admin/appointment-actions';
import { getAppointmentDetail, getAssignableDoctors, OPEN_APPOINTMENT_STATUSES } from '@/lib/data/admin';
import { requireAdminPage } from '@/lib/authz';
import { cn, formatEnums, getRiskLevelStyle } from '@/lib/utils';
import type { AppointmentStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Appointment details' };

const STEPS: { status: AppointmentStatus; label: string }[] = [
  { status: 'PENDING_INTAKE', label: 'Intake' },
  { status: 'READY_FOR_REVIEW', label: 'Review' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'IN_PROGRESS', label: 'Consultation' },
  { status: 'NOTES_GENERATED', label: 'Notes' },
  { status: 'COMPLETED', label: 'Completed' },
];

const AppointmentDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAdminPage();
  const { id } = await params;
  const [detail, doctors] = await Promise.all([getAppointmentDetail(id), getAssignableDoctors()]);
  if (!detail) notFound();

  const { appointment: a, history } = detail;
  const isOpen = OPEN_APPOINTMENT_STATUSES.includes(a.status);
  const isCancelled = a.status === 'CANCELLED';
  const currentStep = STEPS.findIndex(s => s.status === a.status);
  const cancellation = history.find(h => h.action === 'APPOINTMENT_CANCELLED');
  const cancelReason = (cancellation?.metadata as { reason?: string } | null)?.reason;

  const chatState = !a.activeConversation
    ? { label: 'Closed', tone: 'text-slate-500' }
    : a.activeConversation.chatLocksAt
      ? new Date(a.activeConversation.chatLocksAt) > new Date()
        ? { label: `Open until ${format(a.activeConversation.chatLocksAt, 'MMM d')}`, tone: 'text-amber-700' }
        : { label: 'Locked', tone: 'text-slate-500' }
      : { label: 'Open', tone: 'text-emerald-700' };

  const workflow: { label: string; done: boolean; detail: string }[] = [
    { label: 'Intake form', done: !!a.intakeForm, detail: a.intakeForm ? `Submitted ${formatDateTime(a.intakeForm.createdAt)}` : 'Waiting for the patient' },
    {
      label: 'Clinical note',
      done: !!a.clinicalNote,
      detail: a.clinicalNote ? `Last updated ${formatDateTime(a.clinicalNote.updatedAt)}` : 'Not written yet',
    },
    {
      label: 'Prescriptions',
      done: (a.clinicalNote?._count.prescriptions ?? 0) > 0,
      detail: a.clinicalNote?._count.prescriptions ? `${a.clinicalNote._count.prescriptions} issued` : 'None issued',
    },
    {
      label: 'Follow-up',
      done: !!a.followUp,
      detail: a.followUp
        ? `Recommended for ${format(a.followUp.recommendedDate, 'MMM d, yyyy')}${a.followUp.nextAppointmentId ? ' · booked' : ' · not booked yet'}`
        : a.requiresFollowUp
          ? 'Required — not scheduled yet'
          : 'Not required',
    },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <Link
        href='/admin/appointments'
        className='inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900'>
        <ArrowLeftIcon
          className='size-4'
          aria-hidden
        />
        All appointments
      </Link>

      {/* Summary header */}
      <header className='flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between'>
        <div className='flex items-start gap-4'>
          <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
            <CalendarClockIcon
              className='size-6'
              aria-hidden
            />
          </span>
          <div className='min-w-0'>
            <h1 className='text-xl font-extrabold tracking-tight text-slate-900'>{a.appointmentType}</h1>
            <p className='mt-0.5 text-sm text-slate-600'>
              {format(a.scheduledAt, 'EEEE, MMMM d, yyyy')}
              {a.scheduledTime && <> · {a.scheduledTime}</>}
              {a.durationMinutes && <> · {a.durationMinutes} min</>}
            </p>
            <p className='mt-0.5 text-xs text-slate-500'>Booked {formatDistanceToNow(a.createdAt, { addSuffix: true })}</p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <AppointmentStatusBadge status={a.status} />
          <PriorityBadge priority={a.priority} />
          {a.riskLevel && (
            <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', getRiskLevelStyle(a.riskLevel))}>
              {formatEnums(a.riskLevel.toLowerCase())} risk
            </span>
          )}
        </div>
      </header>

      {isCancelled && (
        <div
          role='status'
          className='flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800'>
          <CalendarXIcon
            className='mt-0.5 size-4 shrink-0'
            aria-hidden
          />
          <div>
            <p className='font-bold'>
              Cancelled{cancellation ? ` ${formatDistanceToNow(cancellation.createdAt, { addSuffix: true })}` : ''}
              {cancellation?.actor ? ` by ${cancellation.actor.name}` : ''}
            </p>
            {cancelReason && <p className='mt-0.5 text-rose-700'>Reason: {cancelReason}</p>}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <div className='flex flex-col gap-6 lg:col-span-8'>
          {/* Progress */}
          {!isCancelled && (
            <Panel
              title='Progress'
              icon={<ClipboardListIcon className='size-4' />}
              bodyClassName='px-5 py-6'>
              <ol className='grid grid-cols-3 gap-y-5 sm:grid-cols-6'>
                {STEPS.map((step, i) => {
                  const done = i < currentStep || a.status === 'COMPLETED';
                  const current = i === currentStep && a.status !== 'COMPLETED';
                  return (
                    <li
                      key={step.status}
                      className='flex flex-col items-center gap-2 text-center'
                      aria-current={current ? 'step' : undefined}>
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold',
                          done && 'border-emerald-500 bg-emerald-500 text-white',
                          current && 'border-blue-600 bg-blue-50 text-blue-700',
                          !done && !current && 'border-slate-200 bg-white text-slate-400',
                        )}>
                        {done ? (
                          <CheckIcon
                            className='size-4'
                            aria-hidden
                          />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className={cn('text-xs font-semibold', current ? 'text-blue-700' : done ? 'text-slate-700' : 'text-slate-400')}>
                        {step.label}
                        <span className='sr-only'>{done ? ' (done)' : current ? ' (current step)' : ' (not started)'}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {/* People */}
          <Panel
            title='Care team'
            icon={<UsersIcon className='size-4' />}>
            <div className='grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0'>
              <div className='p-5'>
                <p className='mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500'>Patient</p>
                <Link
                  href={`/admin/users/${a.patient.id}`}
                  className='group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                  <UserAvatar
                    name={a.patient.name}
                    image={a.patient.image}
                  />
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-slate-800 group-hover:text-blue-600'>{a.patient.name}</p>
                    <p className='truncate text-xs text-slate-500'>{a.patient.email}</p>
                    {a.patient.patientProfile && <p className='font-mono text-[11px] text-slate-500'>{a.patient.patientProfile.medicalRecordNumber}</p>}
                  </div>
                </Link>
                {a.patient.banned && <p className='mt-2 text-xs font-semibold text-rose-700'>Account suspended</p>}
              </div>

              <div className='p-5'>
                <p className='mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500'>Doctor</p>
                {a.doctor ? (
                  <>
                    <Link
                      href={`/admin/users/${a.doctor.id}`}
                      className='group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                      <UserAvatar
                        name={a.doctor.name}
                        image={a.doctor.doctorProfile?.imageUrl ?? a.doctor.image}
                      />
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-slate-800 group-hover:text-blue-600'>{a.doctor.name}</p>
                        <p className='truncate text-xs text-slate-500'>{a.doctor.doctorProfile?.specialty ?? a.doctor.email}</p>
                      </div>
                    </Link>
                    {a.doctor.doctorProfile && (
                      <div className='mt-2'>
                        <AvailabilityBadge status={a.doctor.doctorProfile.availabilityStatus} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className='flex items-center gap-3 text-sm text-amber-800'>
                    <span className='flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600'>
                      <UserRoundSearchIcon
                        className='size-4'
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className='font-semibold'>Unassigned</p>
                      <p className='text-xs text-amber-700'>Assign a doctor from the actions panel.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Workflow */}
          <Panel
            title='Care workflow'
            description='Completion status only — clinical content stays with the care team'
            icon={<ClipboardListIcon className='size-4' />}>
            <ul className='divide-y divide-slate-100'>
              {workflow.map(item => (
                <li
                  key={item.label}
                  className='flex items-center gap-3 px-5 py-3'>
                  {item.done ? (
                    <span className='flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
                      <CheckIcon
                        className='size-3.5'
                        aria-hidden
                      />
                    </span>
                  ) : (
                    <span className='flex size-6 items-center justify-center rounded-full bg-slate-50 text-slate-300'>
                      <CircleIcon
                        className='size-3'
                        aria-hidden
                      />
                    </span>
                  )}
                  <span className='flex-1 text-sm font-medium text-slate-800'>
                    {item.label}
                    <span className='sr-only'>{item.done ? ': done' : ': not done'}</span>
                  </span>
                  <span className='text-right text-xs text-slate-500'>{item.detail}</span>
                </li>
              ))}
              <li className='flex items-center gap-3 px-5 py-3'>
                <span className='flex size-6 items-center justify-center rounded-full bg-slate-50 text-slate-500'>
                  <MessageSquareIcon
                    className='size-3.5'
                    aria-hidden
                  />
                </span>
                <span className='flex-1 text-sm font-medium text-slate-800'>Messaging</span>
                <span className='text-right text-xs text-slate-500'>
                  <span className={cn('font-semibold', chatState.tone)}>{chatState.label}</span> · {a._count.messages} message{a._count.messages === 1 ? '' : 's'}
                </span>
              </li>
            </ul>
          </Panel>

          {/* History */}
          <Panel
            title='History'
            description='Administrative events for this appointment'
            icon={<HistoryIcon className='size-4' />}>
            {history.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon className='size-5' />}
                title='No administrative changes'
                description='Reassignments and cancellations will appear here.'
              />
            ) : (
              <ol className='divide-y divide-slate-100'>
                {history.map(event => (
                  <li
                    key={event.id}
                    className='flex items-start gap-3 px-5 py-3'>
                    <AuditActionIcon action={event.action} />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm text-slate-700'>
                        <span className='font-semibold text-slate-900'>{AUDIT_ACTION_META[event.action].label}</span>
                        {event.actor && <span className='text-slate-500'> by {event.actor.name}</span>}
                      </p>
                      <p className='text-xs text-slate-500'>{event.summary}</p>
                    </div>
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className='shrink-0 text-[11px] text-slate-400'>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* Sidebar */}
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <Panel
            title='Manage'
            icon={<SettingsIcon className='size-4' />}
            bodyClassName='p-5'>
            <AppointmentDetailActions
              appointmentId={a.id}
              patientName={a.patient.name}
              currentDoctorId={a.doctor?.id ?? null}
              doctors={doctors}
              isOpen={isOpen}
            />
          </Panel>

          <Panel
            title='Record'
            icon={<CalendarClockIcon className='size-4' />}>
            <dl className='divide-y divide-slate-100 text-sm'>
              {[
                { label: 'Appointment ID', value: <span className='break-all font-mono text-xs'>{a.id}</span> },
                { label: 'Booked', value: formatDateTime(a.createdAt) },
                { label: 'Last updated', value: formatDateTime(a.updatedAt) },
                ...(a.priorFollowUp ? [{ label: 'Origin', value: <Link href={`/admin/appointments/${a.priorFollowUp.appointmentId}`} className='font-semibold text-blue-600 hover:underline'>Follow-up of earlier visit</Link> }] : []),
                ...(a.followUp?.nextAppointmentId
                  ? [{ label: 'Next visit', value: <Link href={`/admin/appointments/${a.followUp.nextAppointmentId}`} className='font-semibold text-blue-600 hover:underline'>View follow-up</Link> }]
                  : []),
              ].map(row => (
                <div
                  key={row.label}
                  className='flex items-start justify-between gap-4 px-5 py-3'>
                  <dt className='shrink-0 text-slate-500'>{row.label}</dt>
                  <dd className='text-right font-medium text-slate-800'>{row.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <p className='flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500'>
            <KeyRoundIcon
              className='mt-0.5 size-3.5 shrink-0'
              aria-hidden
            />
            Symptoms, intake answers and clinical notes are intentionally hidden from administrators (HIPAA minimum-necessary standard).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailPage;
