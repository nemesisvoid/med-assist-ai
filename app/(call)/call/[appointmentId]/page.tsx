import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VideoOffIcon } from 'lucide-react';

import { getLoggedInUser } from '@/lib/get-user';
import { getVideoAccess } from '@/lib/video-access';
import { isVideoConfigured } from '@/lib/video';
import { LOGIN_PATH } from '@/routes';
import VideoCallRoom from '@/components/video/video-call-room';

export const metadata: Metadata = { title: 'Video call' };

const REASONS = {
  not_found: 'This appointment doesn’t exist, or you’re not part of it.',
  closed: 'This appointment is closed, so its video call is no longer available.',
  no_clinician: 'A clinician hasn’t been assigned to this appointment yet.',
} as const;

const CallPage = async ({ params }: { params: Promise<{ appointmentId: string }> }) => {
  const { appointmentId } = await params;
  const session = await getLoggedInUser();
  if (!session) redirect(LOGIN_PATH);

  const role = session.user.role;
  const backHref =
    role === 'DOCTOR' ? `/doctor/appointment/${appointmentId}` : role === 'PATIENT' ? `/patient/appointment/${appointmentId}` : '/';

  const access = role === 'PATIENT' || role === 'DOCTOR' ? await getVideoAccess(appointmentId, session.user.id) : null;
  const problem = !isVideoConfigured()
    ? 'Video calls aren’t set up on this server yet.'
    : !access
      ? REASONS.not_found
      : !access.ok
        ? REASONS[access.reason]
        : null;

  if (problem || !access?.ok) {
    return (
      <main className='flex min-h-dvh items-center justify-center bg-slate-950 px-4 text-center text-white'>
        <div className='max-w-sm'>
          <VideoOffIcon className='mx-auto size-10 text-slate-400' aria-hidden />
          <h1 className='mt-4 text-lg font-bold'>Video call unavailable</h1>
          <p className='mt-2 text-sm text-slate-300'>{problem}</p>
          <Link
            href={backHref}
            className='mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100'>
            Back to appointment
          </Link>
        </div>
      </main>
    );
  }

  return (
    <VideoCallRoom
      appointmentId={access.appointment.id}
      appointmentType={access.appointment.appointmentType}
      userId={session.user.id}
      selfName={access.selfName}
      partnerName={access.partner.name}
      backHref={backHref}
    />
  );
};

export default CallPage;
