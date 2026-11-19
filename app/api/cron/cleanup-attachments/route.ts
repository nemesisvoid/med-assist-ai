import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { cleanupStaleUploads } from '@/lib/attachment-cleanup';

export const dynamic = 'force-dynamic';

/**
 * Daily job (see vercel.json) that deletes chat uploads never sent within 24 hours.
 * Vercel Cron calls it with `Authorization: Bearer <CRON_SECRET>`; anything else is refused.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const authorized =
    !!secret && provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const deleted = await cleanupStaleUploads();
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('[cron] attachment cleanup failed:', error);
    return NextResponse.json({ error: 'cleanup_failed' }, { status: 500 });
  }
}
