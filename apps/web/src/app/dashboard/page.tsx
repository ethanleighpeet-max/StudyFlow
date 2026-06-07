// Server component: stats computed directly from the database
import { db, habits, studySessions } from '@studyflow/db';
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { DashboardContent } from './components/dashboard-content';

export const dynamic = 'force-dynamic';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

const durationMinutes = sql<number>`coalesce(sum(extract(epoch from (${studySessions.endedAt} - ${studySessions.startedAt})) / 60), 0)::int`;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  let stats = {
    todayMinutes: 0,
    todaySessions: 0,
    avgFocusRating: 0,
    streak: 0,
    weeklyMinutes: 0,
    habitsToday: 0,
  };

  if (user) {
    try {
      const [todayRow, weekRow, habitRow, recentSessions] = await Promise.all([
        db
          .select({
            minutes: durationMinutes,
            count: sql<number>`count(*)::int`,
          })
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, user.id),
              isNotNull(studySessions.endedAt),
              gte(studySessions.startedAt, startOfToday()),
            ),
          ),
        db
          .select({
            minutes: durationMinutes,
            avgFocus: sql<number>`coalesce(avg(${studySessions.focusRating}), 0)`,
          })
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, user.id),
              isNotNull(studySessions.endedAt),
              gte(studySessions.startedAt, daysAgo(6)),
            ),
          ),
        db
          .select({
            types: sql<number>`count(distinct ${habits.type})::int`,
          })
          .from(habits)
          .where(and(eq(habits.userId, user.id), gte(habits.loggedAt, startOfToday()))),
        db
          .select({
            day: sql<string>`date(${studySessions.startedAt})::text`,
          })
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, user.id),
              isNotNull(studySessions.endedAt),
              gte(studySessions.startedAt, daysAgo(30)),
            ),
          )
          .groupBy(sql`date(${studySessions.startedAt})`),
      ]);

      // Streak: consecutive days (ending today or yesterday) with a session
      const sessionDays = new Set(recentSessions.map((r) => r.day));
      const fmt = (d: Date): string =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let streak = 0;
      const cursor = new Date();
      if (!sessionDays.has(fmt(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (sessionDays.has(fmt(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      stats = {
        todayMinutes: todayRow[0]?.minutes ?? 0,
        todaySessions: todayRow[0]?.count ?? 0,
        avgFocusRating: Math.round(Number(weekRow[0]?.avgFocus ?? 0) * 10) / 10,
        streak,
        weeklyMinutes: weekRow[0]?.minutes ?? 0,
        habitsToday: habitRow[0]?.types ?? 0,
      };
    } catch {
      // DB unavailable — render with zeros rather than crashing the dashboard
    }
  }

  return (
    <DashboardContent firstName={user?.name?.split(' ')[0] ?? 'there'} initialStats={stats} />
  );
}
