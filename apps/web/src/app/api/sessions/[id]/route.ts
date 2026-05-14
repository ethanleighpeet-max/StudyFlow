import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, studySessions, sessionNotes } from '@studyflow/db';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const endSessionSchema = z.object({
  focusRating: z.number().int().min(1).max(5).optional(),
  mood: z.string().max(50).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [session] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, user.id)))
    .limit(1);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const notes = await db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.sessionId, id))
    .orderBy(sessionNotes.timestampOffset);

  return NextResponse.json({ success: true, data: { ...session, notes } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = endSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  // Verify the session belongs to this user
  const [existing] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const [updated] = await db
    .update(studySessions)
    .set({
      endedAt: new Date(),
      focusRating: parsed.data.focusRating ?? null,
      mood: parsed.data.mood ?? null,
    })
    .where(eq(studySessions.id, id))
    .returning();

  return NextResponse.json({ success: true, data: updated });
}
