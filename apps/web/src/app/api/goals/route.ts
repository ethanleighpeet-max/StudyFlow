import { NextResponse } from 'next/server';
import { db, goals, habits, studySessions, subjects } from '@studyflow/db';
import { createGoalSchema } from '@studyflow/shared';
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface GoalWithProgress {
  id: string;
  type: 'weekly_hours' | 'exam_prep' | 'habit_consistency';
  target: number;
  periodStart: string;
  periodEnd: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  /** Current progress in the goal's unit (hours or days) */
  progress: number;
}

/**
 * GET /api/goals — goals with live progress computed from sessions/habits.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userGoals = await db
    .select({
      id: goals.id,
      type: goals.type,
      target: goals.target,
      periodStart: goals.periodStart,
      periodEnd: goals.periodEnd,
      subjectId: goals.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(goals)
    .leftJoin(subjects, eq(goals.subjectId, subjects.id))
    .where(eq(goals.userId, user.id))
    .orderBy(goals.periodEnd);

  const withProgress: GoalWithProgress[] = await Promise.all(
    userGoals.map(async (goal) => {
      let progress = 0;

      if (goal.type === 'weekly_hours' || goal.type === 'exam_prep') {
        // Hours studied within the goal period (optionally per subject)
        const conditions = [
          eq(studySessions.userId, user.id),
          isNotNull(studySessions.endedAt),
          gte(studySessions.startedAt, goal.periodStart),
          lte(studySessions.startedAt, goal.periodEnd),
        ];
        if (goal.subjectId) {
          conditions.push(eq(studySessions.subjectId, goal.subjectId));
        }

        const [row] = await db
          .select({
            minutes: sql<number>`coalesce(sum(extract(epoch from (${studySessions.endedAt} - ${studySessions.startedAt})) / 60), 0)::int`,
          })
          .from(studySessions)
          .where(and(...conditions));

        progress = Math.round(((row?.minutes ?? 0) / 60) * 10) / 10;
      } else {
        // habit_consistency: distinct days with at least one habit log in period
        const [row] = await db
          .select({
            days: sql<number>`count(distinct date(${habits.loggedAt}))::int`,
          })
          .from(habits)
          .where(
            and(
              eq(habits.userId, user.id),
              gte(habits.loggedAt, goal.periodStart),
              lte(habits.loggedAt, goal.periodEnd),
            ),
          );

        progress = row?.days ?? 0;
      }

      return {
        ...goal,
        periodStart: goal.periodStart.toISOString(),
        periodEnd: goal.periodEnd.toISOString(),
        progress,
      };
    }),
  );

  return NextResponse.json({ success: true, data: withProgress });
}

/**
 * POST /api/goals — create a goal.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createGoalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [goal] = await db
    .insert(goals)
    .values({
      userId: user.id,
      subjectId: parsed.data.subjectId,
      type: parsed.data.type,
      target: parsed.data.target,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
    })
    .returning();

  return NextResponse.json({ success: true, data: goal }, { status: 201 });
}
