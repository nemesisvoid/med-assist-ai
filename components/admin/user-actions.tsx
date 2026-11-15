'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BanIcon, EllipsisVerticalIcon, EyeIcon, LogOutIcon, ShieldCheckIcon, UserCheckIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { changeUserRole, reactivateUser, revokeUserSessions, suspendUser } from '@/actions/admin.action';
import type { Role } from '@/generated/prisma/enums';
import { ActionDialog, btnDanger, btnSecondary, fieldInputClass, fieldLabelClass, useAdminAction } from './action-dialog';
import { cn } from '@/lib/utils';

export type ManagedUser = {
  id: string;
  name: string;
  role: Role;
  banned: boolean;
  hasDoctorProfile: boolean;
};

type DialogKind = 'role' | 'suspend' | 'reactivate' | 'revoke' | null;

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: 'PATIENT', label: 'Patient', description: 'Books appointments and manages their own health record.' },
  { value: 'DOCTOR', label: 'Doctor', description: 'Reviews assigned appointments and writes clinical notes.' },
  { value: 'ADMIN', label: 'Administrator', description: 'Full access to user management and the audit log.' },
];

function useUserDialogs(user: ManagedUser) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [role, setRole] = useState<Role>(user.role);
  const [specialty, setSpecialty] = useState('');
  const [reason, setReason] = useState('');
  const { run, isPending } = useAdminAction();

  const open = (kind: DialogKind) => {
    setRole(user.role);
    setSpecialty('');
    setReason('');
    setDialog(kind);
  };
  const close = () => setDialog(null);
  const needsSpecialty = role === 'DOCTOR' && !user.hasDoctorProfile;

  const dialogs = (
    <>
      <ActionDialog
        open={dialog === 'role'}
        onOpenChange={o => !o && close()}
        title={`Change role for ${user.name}`}
        description='The user is signed out of all devices so the new permissions apply immediately.'
        confirmLabel='Update role'
        pending={isPending}
        confirmDisabled={role === user.role || (needsSpecialty && specialty.trim().length < 2)}
        onConfirm={() => run(() => changeUserRole({ userId: user.id, role, specialty: needsSpecialty ? specialty : undefined }), close)}>
        <fieldset className='flex flex-col gap-2'>
          <legend className={fieldLabelClass}>Role</legend>
          {ROLE_OPTIONS.map(option => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                role === option.value ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50',
              )}>
              <input
                type='radio'
                name='role'
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className='mt-0.5 accent-blue-600'
              />
              <span>
                <span className='block text-sm font-semibold text-slate-800'>
                  {option.label}
                  {option.value === user.role && <span className='ml-2 text-xs font-medium text-slate-500'>(current)</span>}
                </span>
                <span className='block text-xs text-slate-500'>{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {needsSpecialty && (
          <div>
            <label
              htmlFor='role-specialty'
              className={fieldLabelClass}>
              Specialty
            </label>
            <input
              id='role-specialty'
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder='e.g. Family Medicine'
              className={fieldInputClass}
              required
            />
          </div>
        )}
      </ActionDialog>

      <ActionDialog
        open={dialog === 'suspend'}
        onOpenChange={o => !o && close()}
        title={`Suspend ${user.name}?`}
        description='They will be signed out everywhere and blocked from signing in until reactivated. Their records are kept.'
        confirmLabel='Suspend account'
        tone='danger'
        pending={isPending}
        confirmDisabled={reason.trim().length < 5}
        onConfirm={() => run(() => suspendUser({ userId: user.id, reason }), close)}>
        <div>
          <label
            htmlFor='suspend-reason'
            className={fieldLabelClass}>
            Reason (recorded in the audit log)
          </label>
          <textarea
            id='suspend-reason'
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder='e.g. Reported for sharing account credentials'
            className={cn(fieldInputClass, 'resize-none')}
            required
          />
        </div>
      </ActionDialog>

      <ActionDialog
        open={dialog === 'reactivate'}
        onOpenChange={o => !o && close()}
        title={`Reactivate ${user.name}?`}
        description='They will be able to sign in again immediately.'
        confirmLabel='Reactivate'
        pending={isPending}
        onConfirm={() => run(() => reactivateUser(user.id), close)}
      />

      <ActionDialog
        open={dialog === 'revoke'}
        onOpenChange={o => !o && close()}
        title='Sign out of all devices?'
        description={`${user.name} will need to sign in again on every device. Use this if an account may be compromised.`}
        confirmLabel='Revoke sessions'
        tone='danger'
        pending={isPending}
        onConfirm={() => run(() => revokeUserSessions(user.id), close)}
      />
    </>
  );

  return { open, dialogs };
}

/** Row-level overflow menu used in the users table. */
export const UserRowActions = ({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) => {
  const { open, dialogs } = useUserDialogs(user);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${user.name}`}
          className='flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 data-popup-open:bg-slate-100'>
          <EllipsisVerticalIcon className='size-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-52 p-1.5'>
          <DropdownMenuItem
            className='gap-2.5 px-2.5 py-2 text-[13px]'
            render={<Link href={`/admin/users/${user.id}`} />}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
          {!isSelf && (
            <>
              <DropdownMenuItem
                className='gap-2.5 px-2.5 py-2 text-[13px]'
                onClick={() => open('role')}>
                <ShieldCheckIcon />
                Change role
              </DropdownMenuItem>
              <DropdownMenuItem
                className='gap-2.5 px-2.5 py-2 text-[13px]'
                onClick={() => open('revoke')}>
                <LogOutIcon />
                Sign out everywhere
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.banned ? (
                <DropdownMenuItem
                  className='gap-2.5 px-2.5 py-2 text-[13px]'
                  onClick={() => open('reactivate')}>
                  <UserCheckIcon />
                  Reactivate account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant='destructive'
                  className='gap-2.5 px-2.5 py-2 text-[13px]'
                  onClick={() => open('suspend')}>
                  <BanIcon />
                  Suspend account
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
};

/** Full-width action buttons used on the user detail page. */
export const UserDetailActions = ({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) => {
  const { open, dialogs } = useUserDialogs(user);
  if (isSelf) return <p className='text-xs text-slate-500'>You can’t change your own role or status.</p>;

  return (
    <div className='flex flex-col gap-2'>
      <button
        type='button'
        className={btnSecondary}
        onClick={() => open('role')}>
        <ShieldCheckIcon className='size-4' />
        Change role
      </button>
      <button
        type='button'
        className={btnSecondary}
        onClick={() => open('revoke')}>
        <LogOutIcon className='size-4' />
        Sign out everywhere
      </button>
      {user.banned ? (
        <button
          type='button'
          className={btnSecondary}
          onClick={() => open('reactivate')}>
          <UserCheckIcon className='size-4' />
          Reactivate account
        </button>
      ) : (
        <button
          type='button'
          className={btnDanger}
          onClick={() => open('suspend')}>
          <BanIcon className='size-4' />
          Suspend account
        </button>
      )}
      {dialogs}
    </div>
  );
};
