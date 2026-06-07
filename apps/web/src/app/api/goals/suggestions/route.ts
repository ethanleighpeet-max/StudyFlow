import { NextResponse } from 'next/server';
import { db, studySessions, subjects } from '@studyflow/db';
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface SubjectSuggestion {
  subjectId: string;
  subjectName: string;
  hours: number;
}

/** Last calendar week (Mon 00:00 — Sun 23:59:59.999, the week before the current one). */
function lastWeekRange(): { start: Date; end: Date } {
  const start = new Date();
  const day = start.getDay() === 0 ? 6 : start.getDay() - 1; // Monday = 0
  start.setDate(start.getDate() - day - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * GET /api/goals/suggestions — last calendar week's studied hours, overall and per subject.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { start, end } = lastWeekRange();

  const conditions = and(
    eq(studySessions.userId, user.id),
    isNotNull(studySessions.endedAt),
    gte(studySessions.startedAt, start),
    lte(studySessions.startedAt, end),
  );

  const minutesExpr = sql<number>`coalesce(sum(extract(epoch from (${studySessions.endedAt} - ${studySessions.startedAt})) / 60), 0)::int`;

  const [overallRow] = await db
    .select({ minutes: minutesExpr })
    .from(studySessions)
    .where(conditions);

  const subjectRows = await db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      minutes: minutesExpr,
    })
    .from(studySessions)
    .innerJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .where(conditions)
    .groupBy(subjects.id, subjects.name);

  const bySubject: SubjectSuggestion[] = subjectRows.map((row) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    hours: toHours(row.minutes),
  }));

  return NextResponse.json({
    success: true,
    data: {
      overall: toHours(overallRow?.minutes ?? 0),
      bySubject,
    },
  });
}
