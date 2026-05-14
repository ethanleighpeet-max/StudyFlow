import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, studySessions, sessionNotes } from '@studyflow/db';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  timestampOffset: z.number().int().min(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // Verify session belongs to user
  const [session] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, user.id)))
    .limit(1);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [note] = await db
    .insert(sessionNotes)
    .values({
      sessionId,
      content: parsed.data.content,
      timestampOffset: parsed.data.timestampOffset,
    })
    .returning();

  // Increment notes count on the session
  await db
    .update(studySessions)
    .set({ notesCount: sql`${studySessions.notesCount} + 1` })
    .where(eq(studySessions.id, sessionId));

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
