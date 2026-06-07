import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, studySessions, subjects, sessionNotes } from '@studyflow/db';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const startSessionSchema = z.object({
  subjectId: z.string().uuid().optional(),
  timerMode: z.enum(['pomodoro', 'custom', 'open-ended']),
  timerDurationMinutes: z.number().int().min(1).max(480).optional(),
  sessionGoal: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
  const offset = Number(searchParams.get('offset') ?? '0');
  const subjectId = searchParams.get('subjectId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const q = searchParams.get('q')?.trim();

  const conditions = [eq(studySessions.userId, user.id)];

  if (subjectId) {
    conditions.push(eq(studySessions.subjectId, subjectId));
  }
  if (q) {
    // Search across note content, session goal, mood, and subject name
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    conditions.push(
      sql`(
        exists (
          select 1 from ${sessionNotes}
          where ${sessionNotes.sessionId} = ${studySessions.id}
          and ${sessionNotes.content} ilike ${pattern}
        )
        or ${studySessions.sessionGoal} ilike ${pattern}
        or ${studySessions.mood} ilike ${pattern}
        or ${subjects.name} ilike ${pattern}
      )`,
    );
  }
  if (dateFrom) {
    conditions.push(gte(studySessions.startedAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(studySessions.startedAt, new Date(dateTo)));
  }

  const sessions = await db
    .select({
      id: studySessions.id,
      subjectId: studySessions.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      startedAt: studySessions.startedAt,
      endedAt: studySessions.endedAt,
      timerMode: studySessions.timerMode,
      timerDurationMinutes: studySessions.timerDurationMinutes,
      focusRating: studySessions.focusRating,
      mood: studySessions.mood,
      sessionGoal: studySessions.sessionGoal,
      notesCount: studySessions.notesCount,
    })
    .from(studySessions)
    .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .where(and(...conditions))
    .orderBy(desc(studySessions.startedAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studySessions)
    .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .where(and(...conditions));
  const count = countResult[0]?.count ?? 0;

  return NextResponse.json({
    success: true,
    data: sessions,
    meta: { total: count, limit, offset },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { timerMode, timerDurationMinutes, subjectId, sessionGoal } = parsed.data;

    // Pomodoro defaults to 25 minutes
    const duration = timerMode === 'pomodoro' ? 25 : timerDurationMinutes ?? null;

    const [session] = await db
      .insert(studySessions)
      .values({
        userId: user.id,
        subjectId: subjectId ?? null,
        timerMode,
        timerDurationMinutes: duration,
        sessionGoal: sessionGoal ?? null,
      })
      .returning();

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
