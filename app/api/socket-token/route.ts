import { NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/get-user';
import { createSocketToken } from '@/lib/socket-token';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** Issues a short-lived token the realtime chat server uses to identify the signed-in user. */
export async function GET() {
  const session = await getLoggedInUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: noStore });

  const secret = process.env.SOCKET_AUTH_SECRET;
  if (!secret) {
    console.error('[socket-token] SOCKET_AUTH_SECRET is not set; realtime chat cannot authenticate users.');
    return NextResponse.json({ error: 'not_configured' }, { status: 503, headers: noStore });
  }

  const token = createSocketToken({ id: session.user.id, role: session.user.role ?? 'PATIENT' }, secret);
  return NextResponse.json({ token }, { headers: noStore });
}
