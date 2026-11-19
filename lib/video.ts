/**
 * LiveKit video rooms for appointments. Server-only: signs room passes with the
 * LiveKit API secret, which must never reach the browser.
 *
 * One room per appointment. A pass is only issued (see actions/video.action.ts)
 * to that appointment's patient or assigned clinician, is limited to that room,
 * and expires after an hour.
 */

import { AccessToken } from 'livekit-server-sdk';

const TOKEN_TTL = '1h';

export const isVideoConfigured = () =>
  !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.NEXT_PUBLIC_LIVEKIT_URL);

export const videoRoomName = (appointmentId: string) => `appt_${appointmentId}`;

export async function createVideoToken({
  appointmentId,
  userId,
  displayName,
  role,
}: {
  appointmentId: string;
  userId: string;
  displayName: string;
  role: string;
}): Promise<string> {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: displayName,
    ttl: TOKEN_TTL,
    metadata: JSON.stringify({ role }),
  });
  token.addGrant({
    room: videoRoomName(appointmentId),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}
