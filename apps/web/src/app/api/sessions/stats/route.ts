import { NextResponse } from 'next/server';
import { db, studySessions } from '@studyflow/db';
import { eq, and, gte, isNotNull, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday

  // Today's study time (sum of completed sessions)
  const [todayStats] = await db
    .select({
      totalMinutes: sql<number>`coalesce(sum(extract(epoch from ${studySessions.endedAt} - ${studySessions.startedAt}) / 60), 0)::int`,
      sessionCount: sql<number>`count(*)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        gte(studySessions.startedAt, startOfToday),
        isNotNull(studySessions.endedAt),
      ),
    );

  // Average focus rating from completed sessions this week
  const [focusStats] = await db
    .select({
      avgFocus: sql<number>`coalesce(round(avg(${studySessions.focusRating})::numeric, 1), 0)`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        gte(studySessions.startedAt, startOfWeek),
        isNotNull(studySessions.focusRating),
      ),
    );

  // Streak: count consecutive days with at least one completed session
  // going backwards from today
  const recentDays = await db
    .select({
      day: sql<string>`date(${studySessions.startedAt} at time zone 'UTC')`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        isNotNull(studySessions.endedAt),
      ),
    )
    .groupBy(sql`date(${studySessions.startedAt} at time zone 'UTC')`)
    .orderBy(sql`date(${studySessions.startedAt} at time zone 'UTC') desc`)
    .limit(60);

  let streak = 0;
  const todayStr = startOfToday.toISOString().split('T')[0] ?? '';
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0] ?? '';

  const dayStrings = recentDays.map((d) => d.day);
  const firstDay = dayStrings[0];

  // Streak must start from today or yesterday
  if (firstDay !== undefined && (firstDay === todayStr || firstDay === yesterdayStr)) {
    let expectedDate = new Date(firstDay);
    for (const d of dayStrings) {
      const current = new Date(d);
      const diffDays = Math.round(
        (expectedDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 0) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Weekly total
  const [weekStats] = await db
    .select({
      totalMinutes: sql<number>`coalesce(sum(extract(epoch from ${studySessions.endedAt} - ${studySessions.startedAt}) / 60), 0)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        gte(studySessions.startedAt, startOfWeek),
        isNotNull(studySessions.endedAt),
      ),
    );

  return NextResponse.json({
    success: true,
    data: {
      todayMinutes: todayStats?.totalMinutes ?? 0,
      todaySessions: todayStats?.sessionCount ?? 0,
      avgFocusRating: Number(focusStats?.avgFocus ?? 0),
      streak,
      weeklyMinutes: weekStats?.totalMinutes ?? 0,
    },
  });
}
