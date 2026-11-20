'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrainIcon, CalendarXIcon, EllipsisVerticalIcon, EyeIcon, LoaderIcon, SearchIcon, ShuffleIcon, StethoscopeIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cancelAppointment, getReassignAvailability, reassignAppointment } from '@/actions/admin.action';
import type { DoctorAvailabilityStatus, ProviderType } from '@/generated/prisma/enums';
import { ActionDialog, btnDanger, btnSecondary, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';
import { cn } from '@/lib/utils';

export type AssignableDoctor = {
  id: string;
  /** Display name: "Dr. Name" for doctors, "Name, LMFT" for therapists. */
  name: string;
  specialty: string;
  providerType: ProviderType;
  availability: DoctorAvailabilityStatus;
  openAppointments: number;
};

type TypeFilter = 'ALL' | ProviderType;

const GROUPS: { type: ProviderType; label: string; Icon: typeof StethoscopeIcon }[] = [
  { type: 'DOCTOR', label: 'Doctors', Icon: StethoscopeIcon },
  { type: 'THERAPIST', label: 'Therapists', Icon: BrainIcon },
];

const UNAVAILABLE_TEXT = { booked: 'Booked at this time', off: 'Not working at this time' } as const;

const availabilityText: Record<DoctorAvailabilityStatus, string> = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  OFFLINE: 'Offline',
  ON_LEAVE: 'On leave',
};

type Props = {
  appointmentId: string;
  patientName: string;
  currentDoctorId: string | null;
  doctors: AssignableDoctor[];
  isOpen: boolean;
};

/**
 * Clinician picker for (re)assigning an appointment: grouped and labelled by
 * type, searchable, and showing who is booked or not working at the
 * appointment's time (those can't be picked).
 */
function ClinicianPicker({
  appointmentId,
  doctors,
  currentDoctorId,
  value,
  onChange,
}: {
  appointmentId: string;
  doctors: AssignableDoctor[];
  currentDoctorId: string | null;
  value: string;
  onChange: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState<{ slotLabel: string | null; unavailable: Record<string, 'booked' | 'off'> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReassignAvailability(appointmentId).then(res => {
      if (cancelled) return;
      if (res.ok) setAvailability({ slotLabel: res.slotLabel, unavailable: res.unavailable });
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const q = query.trim().toLowerCase();
  const others = doctors.filter(d => d.id !== currentDoctorId);
  const candidates = others
    .filter(d => typeFilter === 'ALL' || d.providerType === typeFilter)
    .filter(d => !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
    // Free first, then "Available" status, then lightest caseload.
    .sort(
      (a, b) =>
        Number(!!availability?.unavailable[a.id]) - Number(!!availability?.unavailable[b.id]) ||
        Number(b.availability === 'AVAILABLE') - Number(a.availability === 'AVAILABLE') ||
        a.openAppointments - b.openAppointments,
    );
  const counts: Record<TypeFilter, number> = {
    ALL: others.length,
    DOCTOR: others.filter(d => d.providerType === 'DOCTOR').length,
    THERAPIST: others.filter(d => d.providerType === 'THERAPIST').length,
  };

  return (
    <div className='flex flex-col gap-3'>
      {availability?.slotLabel && (
        <p className='text-xs text-slate-500'>
          Showing who is free on <span className='font-semibold text-slate-700'>{availability.slotLabel}</span>.
        </p>
      )}
      {error && <p className='text-xs font-medium text-red-600'>{error}</p>}

      <div className='flex flex-wrap items-center gap-2'>
        <div role='radiogroup' aria-label='Clinician type' className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5'>
          {(['ALL', 'DOCTOR', 'THERAPIST'] as const).map(t => (
            <button
              key={t}
              type='button'
              role='radio'
              aria-checked={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                typeFilter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}>
              {t === 'ALL' ? 'All' : t === 'DOCTOR' ? 'Doctors' : 'Therapists'} <span className='text-slate-400'>{counts[t]}</span>
            </button>
          ))}
        </div>
        <label className='relative min-w-40 flex-1'>
          <span className='sr-only'>Search clinicians</span>
          <SearchIcon className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400' aria-hidden />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search name or specialty'
            className='w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm'
          />
        </label>
      </div>

      <fieldset className='flex max-h-80 flex-col gap-4 overflow-y-auto pr-1'>
        <legend className='sr-only'>Clinician</legend>
        {!availability && !error && (
          <p className='flex items-center gap-2 text-sm text-slate-500'>
            <LoaderIcon className='size-4 animate-spin' aria-hidden /> Checking who is free…
          </p>
        )}
        {candidates.length === 0 && <p className='text-sm text-slate-500'>No clinicians match.</p>}
        {GROUPS.map(({ type, label, Icon }) => {
          const group = candidates.filter(d => d.providerType === type);
          if (group.length === 0) return null;
          return (
            <div key={type}>
              <p className='mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500'>
                <Icon className='size-3.5' aria-hidden />
                {label}
              </p>
              <div className='flex flex-col gap-2'>
                {group.map(d => {
                  const blocked = availability?.unavailable[d.id];
                  return (
                    <label
                      key={d.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                        blocked
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                          : value === d.id
                            ? 'cursor-pointer border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                            : 'cursor-pointer border-slate-200 hover:bg-slate-50',
                      )}>
                      <input
                        type='radio'
                        name={`clinician-${appointmentId}`}
                        value={d.id}
                        checked={value === d.id}
                        disabled={!!blocked || !availability}
                        onChange={() => onChange(d.id)}
                        className='accent-blue-600'
                      />
                      <span className='min-w-0 flex-1'>
                        <span className='flex items-center gap-2'>
                          <span className='truncate text-sm font-semibold text-slate-800'>{d.name}</span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wider',
                              d.providerType === 'THERAPIST' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700',
                            )}>
                            {d.providerType === 'THERAPIST' ? 'Therapist' : 'Doctor'}
                          </span>
                        </span>
                        <span className='block truncate text-xs text-slate-500'>{d.specialty}</span>
                      </span>
                      <span className='text-right text-[11px] text-slate-500'>
                        {blocked ? (
                          <span className='block font-semibold text-amber-700'>{UNAVAILABLE_TEXT[blocked]}</span>
                        ) : (
                          <span className={cn('block font-semibold', d.availability === 'AVAILABLE' ? 'text-emerald-700' : 'text-slate-500')}>
                            {availabilityText[d.availability]}
                          </span>
                        )}
                        {d.openAppointments} open
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}

/** Reassign + cancel dialogs, shared by the table row menu and the detail page. */
function useAppointmentDialogs({ appointmentId, patientName, currentDoctorId, doctors }: Omit<Props, 'isOpen'>) {
  const [dialog, setDialog] = useState<'reassign' | 'cancel' | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const { run, isPending } = useAdminAction();

  const close = () => {
    setDialog(null);
    setDoctorId('');
    setReason('');
  };

  const dialogs = (
    <>
      <ActionDialog
        open={dialog === 'reassign'}
        onOpenChange={o => !o && close()}
        title={currentDoctorId ? 'Reassign appointment' : 'Assign a clinician'}
        description={`Choose who should see ${patientName}. The patient and the clinicians involved are notified.`}
        confirmLabel={currentDoctorId ? 'Reassign' : 'Assign'}
        pending={isPending}
        confirmDisabled={!doctorId}
        onConfirm={() => run(() => reassignAppointment({ appointmentId, doctorId }), close)}>
        {dialog === 'reassign' && (
          <ClinicianPicker
            appointmentId={appointmentId}
            doctors={doctors}
            currentDoctorId={currentDoctorId}
            value={doctorId}
            onChange={setDoctorId}
          />
        )}
      </ActionDialog>

      <ActionDialog
        open={dialog === 'cancel'}
        onOpenChange={o => !o && close()}
        title='Cancel this appointment?'
        description={`${patientName} and their doctor will be notified with your reason. This can’t be undone.`}
        confirmLabel='Cancel appointment'
        tone='danger'
        pending={isPending}
        confirmDisabled={reason.trim().length < 5}
        onConfirm={() => run(() => cancelAppointment({ appointmentId, reason }), close)}>
        <div>
          <label
            htmlFor={`cancel-reason-${appointmentId}`}
            className={fieldLabelClass}>
            Reason (shared with the patient)
          </label>
          <textarea
            id={`cancel-reason-${appointmentId}`}
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder='e.g. The clinic is closed on this date. Please rebook.'
            className={cn(fieldInputClass, 'resize-none')}
            required
          />
        </div>
      </ActionDialog>
    </>
  );

  return { open: setDialog, dialogs };
}

/** Overflow menu for a row in the appointments table. */
export const AppointmentRowActions = ({ appointmentId, patientName, currentDoctorId, doctors, isOpen }: Props) => {
  const { open, dialogs } = useAppointmentDialogs({ appointmentId, patientName, currentDoctorId, doctors });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${patientName}'s appointment`}
          className='flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 data-popup-open:bg-slate-100'>
          <EllipsisVerticalIcon className='size-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-52 p-1.5'>
          <DropdownMenuItem
            className='gap-2.5 px-2.5 py-2 text-[13px]'
            render={<Link href={`/admin/appointments/${appointmentId}`} />}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
          {isOpen && (
            <>
              <DropdownMenuItem
                className='gap-2.5 px-2.5 py-2 text-[13px]'
                onClick={() => open('reassign')}>
                <ShuffleIcon />
                {currentDoctorId ? 'Reassign clinician' : 'Assign clinician'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                className='gap-2.5 px-2.5 py-2 text-[13px]'
                onClick={() => open('cancel')}>
                <CalendarXIcon />
                Cancel appointment
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isOpen && dialogs}
    </>
  );
};

/** Stacked action buttons for the appointment detail page. */
export const AppointmentDetailActions = ({ appointmentId, patientName, currentDoctorId, doctors, isOpen }: Props) => {
  const { open, dialogs } = useAppointmentDialogs({ appointmentId, patientName, currentDoctorId, doctors });
  if (!isOpen) return <p className='text-xs leading-relaxed text-slate-500'>This appointment is closed, so it can no longer be reassigned or cancelled.</p>;

  return (
    <div className='flex flex-col gap-2'>
      <button
        type='button'
        className={btnSecondary}
        onClick={() => open('reassign')}>
        <ShuffleIcon className='size-4' />
        {currentDoctorId ? 'Reassign clinician' : 'Assign clinician'}
      </button>
      <button
        type='button'
        className={btnDanger}
        onClick={() => open('cancel')}>
        <CalendarXIcon className='size-4' />
        Cancel appointment
      </button>
      {dialogs}
    </div>
  );
};
