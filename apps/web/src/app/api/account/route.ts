import { NextResponse } from 'next/server';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * DELETE /api/account — GDPR account deletion.
 * Deletes the users row; all related data is removed via DB cascades.
 */
export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, user.id))
    .returning({ id: users.id });

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
}
