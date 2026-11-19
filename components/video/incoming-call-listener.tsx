'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket-client';

type IncomingCall = { appointmentId: string; appointmentType: string; callerName: string };

/**
 * Shows a "X is calling" notice on any patient or clinician page when the other
 * participant of one of the user's appointments joins its video call. The chat
 * server only sends this to that appointment's other participant.
 */
export default function IncomingCallListener({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const socket = getSocket(userId);
    const onIncoming = ({ appointmentId, appointmentType, callerName }: IncomingCall) => {
      toast(`${callerName} is calling`, {
        id: `call-${appointmentId}`, // one notice per call, even if they rejoin
        description: `Video call for your ${appointmentType} appointment.`,
        duration: 45_000,
        action: { label: 'Join', onClick: () => router.push(`/call/${appointmentId}`) },
      });
    };
    socket.on('incoming_call', onIncoming);
    return () => {
      socket.off('incoming_call', onIncoming);
    };
  }, [userId, router]);

  return null;
}
