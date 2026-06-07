import { NextResponse } from 'next/server';
import { db, habits } from '@studyflow/db';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * DELETE /api/habits/[id] — remove a habit log (undo).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: deleted });
}
