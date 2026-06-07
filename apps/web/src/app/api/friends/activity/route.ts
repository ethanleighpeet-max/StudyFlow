import { NextResponse } from 'next/server';
import { db, friendships, studySessions, users } from '@studyflow/db';
import { and, eq, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface ActivityEntry {
  name: string;
  avatarUrl: string | null;
  minutes: number;
  sessions: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/friends/activity — today's study activity of accepted friends who,
 * like me, opted in to sharing (preferences.shareActivity). Empty when I'm opted out.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Sharing is mutual: if I haven't opted in, I don't see friends' activity either
  if (user.preferences.shareActivity !== true) {
    return NextResponse.json({ success: true, data: [] });
  }

  const accepted = await db
    .select({ userId: friendships.userId, friendId: friendships.friendId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id)),
      ),
    );

  const friendIds = accepted.map((f) => (f.userId === user.id ? f.friendId : f.userId));

  if (friendIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  // Only friends who also opted in
  const friendUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      preferences: users.preferences,
    })
    .from(users)
    .where(inArray(users.id, friendIds));

  const sharingFriends = friendUsers.filter((f) => f.preferences.shareActivity === true);

  if (sharingFriends.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const sharingIds = sharingFriends.map((f) => f.id);

  const rows = await db
    .select({
      userId: studySessions.userId,
      minutes: sql<number>`coalesce(sum(extract(epoch from (${studySessions.endedAt} - ${studySessions.startedAt})) / 60), 0)::int`,
      sessions: sql<number>`count(*)::int`,
    })
    .from(studySessions)
    .where(
      and(
        inArray(studySessions.userId, sharingIds),
        isNotNull(studySessions.endedAt),
        gte(studySessions.startedAt, startOfToday()),
      ),
    )
    .groupBy(studySessions.userId);

  const byUser = new Map(rows.map((r) => [r.userId, r]));

  const feed: ActivityEntry[] = sharingFriends
    .map((f) => {
      const row = byUser.get(f.id);
      return {
        name: f.name,
        avatarUrl: f.avatarUrl,
        minutes: row?.minutes ?? 0,
        sessions: row?.sessions ?? 0,
      };
    })
    .filter((entry) => entry.sessions > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return NextResponse.json({ success: true, data: feed });
}
