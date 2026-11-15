'use client';

import { useState } from 'react';
import { CalendarXIcon, EllipsisVerticalIcon, ShuffleIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cancelAppointment, reassignAppointment } from '@/actions/admin.action';
import type { DoctorAvailabilityStatus } from '@/generated/prisma/enums';
import { ActionDialog, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';
import { cn } from '@/lib/utils';

export type AssignableDoctor = {
  id: string;
  name: string;
  specialty: string;
  availability: DoctorAvailabilityStatus;
  openAppointments: number;
};

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

export const AppointmentRowActions = ({ appointmentId, patientName, currentDoctorId, doctors, isOpen }: Props) => {
  const [dialog, setDialog] = useState<'reassign' | 'cancel' | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const { run, isPending } = useAdminAction();

  const close = () => {
    setDialog(null);
    setDoctorId('');
    setReason('');
  };

  if (!isOpen) return <span className='sr-only'>No actions available for closed appointments</span>;

  // Prefer clinicians who are available and have the lightest open caseload.
  const sorted = [...doctors]
    .filter(d => d.id !== currentDoctorId)
    .sort((a, b) => Number(b.availability === 'AVAILABLE') - Number(a.availability === 'AVAILABLE') || a.openAppointments - b.openAppointments);

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
            onClick={() => setDialog('reassign')}>
            <ShuffleIcon />
            {currentDoctorId ? 'Reassign doctor' : 'Assign doctor'}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant='destructive'
            className='gap-2.5 px-2.5 py-2 text-[13px]'
            onClick={() => setDialog('cancel')}>
            <CalendarXIcon />
            Cancel appointment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ActionDialog
        open={dialog === 'reassign'}
        onOpenChange={o => !o && close()}
        title={currentDoctorId ? 'Reassign appointment' : 'Assign a doctor'}
        description={`Choose who should see ${patientName}. The patient and both doctors are notified.`}
        confirmLabel={currentDoctorId ? 'Reassign' : 'Assign'}
        pending={isPending}
        confirmDisabled={!doctorId}
        onConfirm={() => run(() => reassignAppointment({ appointmentId, doctorId }), close)}>
        <fieldset className='flex max-h-72 flex-col gap-2 overflow-y-auto pr-1'>
          <legend className={fieldLabelClass}>Doctor</legend>
          {sorted.length === 0 && <p className='text-sm text-slate-500'>No other active doctors are available.</p>}
          {sorted.map(d => (
            <label
              key={d.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                doctorId === d.id ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50',
              )}>
              <input
                type='radio'
                name='doctor'
                value={d.id}
                checked={doctorId === d.id}
                onChange={() => setDoctorId(d.id)}
                className='accent-blue-600'
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-semibold text-slate-800'>{d.name}</span>
                <span className='block truncate text-xs text-slate-500'>{d.specialty}</span>
              </span>
              <span className='text-right text-[11px] text-slate-500'>
                <span className={cn('block font-semibold', d.availability === 'AVAILABLE' ? 'text-emerald-700' : 'text-slate-500')}>
                  {availabilityText[d.availability]}
                </span>
                {d.openAppointments} open
              </span>
            </label>
          ))}
        </fieldset>
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
};
