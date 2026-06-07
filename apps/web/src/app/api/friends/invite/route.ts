import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/friends/invite — a shareable link that pre-fills a friend request to me.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    success: true,
    data: { url: `${origin}/dashboard/social?add=${user.id}` },
  });
}
