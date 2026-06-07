import { NextResponse } from 'next/server';
import { db, reflections } from '@studyflow/db';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const saveReflectionSchema = z.object({
  content: z.string().min(1).max(2000),
});

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * GET /api/reflections — the user's last 7 reflections, newest first.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(reflections)
    .where(eq(reflections.userId, user.id))
    .orderBy(desc(reflections.day))
    .limit(7);

  return NextResponse.json({ success: true, data: rows });
}

/**
 * POST /api/reflections — upsert today's reflection { content } (one per day).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saveReflectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const today = todayKey();

  const [existing] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.userId, user.id), eq(reflections.day, today)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(reflections)
      .set({ content: parsed.data.content })
      .where(eq(reflections.id, existing.id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  }

  const [created] = await db
    .insert(reflections)
    .values({
      userId: user.id,
      day: today,
      content: parsed.data.content,
    })
    .returning();

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
