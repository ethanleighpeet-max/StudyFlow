import { NextResponse } from 'next/server';
import { db, habits } from '@studyflow/db';
import { logHabitSchema } from '@studyflow/shared';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/habits?days=N — habit logs for the last N days (default 7, max 90).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get('days')) || 7, 90);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const logs = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, user.id), gte(habits.loggedAt, since)))
    .orderBy(desc(habits.loggedAt));

  return NextResponse.json({ success: true, data: logs });
}

/**
 * POST /api/habits — log a habit { type, value }.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = logHabitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [log] = await db
    .insert(habits)
    .values({
      userId: user.id,
      type: parsed.data.type,
      value: parsed.data.value,
    })
    .returning();

  return NextResponse.json({ success: true, data: log }, { status: 201 });
}
