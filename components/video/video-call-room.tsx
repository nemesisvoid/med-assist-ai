'use client';

import '@livekit/components-styles';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PhoneOffIcon, RotateCcwIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  ConnectionStateToast,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  useTracks,
  type LocalUserChoices,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

import { joinVideoCall } from '@/actions/video.action';
import { getSocket } from '@/lib/socket-client';

type Props = {
  appointmentId: string;
  appointmentType: string;
  userId: string;
  selfName: string;
  partnerName: string;
  backHref: string;
};

type Phase = 'prejoin' | 'joining' | 'call' | 'ended' | 'failed';

/**
 * Appointment video call: a device check (camera, microphone, preview), then the
 * call itself. LiveKit's built-in chat panel is left out on purpose: messages
 * belong in the appointment's saved conversation, not an unsaved side chat.
 */
export default function VideoCallRoom({ appointmentId, appointmentType, userId, selfName, partnerName, backHref }: Props) {
  const [phase, setPhase] = useState<Phase>('prejoin');
  const [connection, setConnection] = useState<{ token: string; serverUrl: string } | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  // A ref, so LiveKit's disconnect callback always sees the current value.
  const wasConnected = useRef(false);

  const handleJoin = async (values: LocalUserChoices) => {
    setChoices(values);
    setPhase('joining');
    const res = await joinVideoCall(appointmentId);
    if (!res.success) {
      toast.error(res.message);
      setPhase('prejoin');
      return;
    }
    setConnection({ token: res.token, serverUrl: res.serverUrl });
    wasConnected.current = false;
    setPhase('call');
  };

  return (
    <main data-lk-theme='default' className='flex h-dvh flex-col bg-slate-950 text-white'>
      <header className='flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Link
            href={backHref}
            aria-label='Back to appointment'
            className='flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white'>
            <ArrowLeftIcon className='size-4' />
          </Link>
          <div className='min-w-0'>
            <h1 className='truncate text-sm font-bold'>Video call with {partnerName}</h1>
            <p className='truncate text-xs text-slate-400'>{appointmentType}</p>
          </div>
        </div>
        <p className='hidden items-center gap-1.5 text-xs text-slate-400 sm:flex'>
          <ShieldCheckIcon className='size-3.5' aria-hidden />
          Private to you and {partnerName} · not recorded
        </p>
      </header>

      {(phase === 'prejoin' || phase === 'joining') && (
        <section className='flex flex-1 items-center justify-center overflow-y-auto p-4'>
          <div className='mai-prejoin w-full max-w-xl'>
            <p className='mb-3 text-center text-sm text-slate-300'>
              Check your camera and microphone, then join. You’ll appear as <span className='font-semibold text-white'>{selfName}</span>.
            </p>
            <PreJoin
              defaults={{ username: selfName, videoEnabled: true, audioEnabled: true }}
              joinLabel={phase === 'joining' ? 'Joining…' : 'Join call'}
              persistUserChoices={false}
              onSubmit={values => {
                if (phase !== 'joining') void handleJoin(values);
              }}
              onError={() => toast.error('Your camera or microphone couldn’t be started. Check your browser permissions.')}
            />
          </div>
        </section>
      )}

      {phase === 'call' && connection && choices && (
        <LiveKitRoom
          serverUrl={connection.serverUrl}
          token={connection.token}
          connect
          video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
          audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
          onConnected={() => {
            wasConnected.current = true;
            getSocket(userId).emit('call_started', { appointmentId });
          }}
          // Disconnecting before ever connecting means the call couldn't be reached, not that the user left.
          onDisconnected={() => setPhase(wasConnected.current ? 'ended' : 'failed')}
          onError={() => {
            if (wasConnected.current) toast.error('The call connection had a problem. Trying to reconnect…');
          }}
          className='flex min-h-0 flex-1 flex-col'>
          <CallStage />
          <RoomAudioRenderer />
          <ConnectionStateToast />
          <ControlBar controls={{ chat: false, settings: false }} />
        </LiveKitRoom>
      )}

      {(phase === 'ended' || phase === 'failed') && (
        <section className='flex flex-1 items-center justify-center p-4 text-center'>
          <div className='max-w-sm'>
            <PhoneOffIcon className='mx-auto size-10 text-slate-400' aria-hidden />
            <h2 className='mt-4 text-lg font-bold'>{phase === 'failed' ? 'Couldn’t connect to the call' : 'You left the call'}</h2>
            {phase === 'failed' && (
              <p className='mt-2 text-sm text-slate-300'>Check your internet connection and try again. If it keeps happening, message your care team instead.</p>
            )}
            <div className='mt-6 flex justify-center gap-2'>
              <button
                type='button'
                onClick={() => setPhase('prejoin')}
                className='inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10'>
                <RotateCcwIcon className='size-4' aria-hidden />
                {phase === 'failed' ? 'Try again' : 'Rejoin'}
              </button>
              <Link href={backHref} className='inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100'>
                Back to appointment
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/** Camera tiles (with placeholders for people whose camera is off) and any screen share. */
function CallStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className='min-h-0 flex-1'>
      <ParticipantTile />
    </GridLayout>
  );
}
