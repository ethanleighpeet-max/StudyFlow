import { NextResponse } from 'next/server';
import { db, friendships } from '@studyflow/db';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const actionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

/**
 * PATCH /api/friends/[id] — accept or decline a pending request.
 * Only the receiving user (friendId) may act.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [friendship] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, id))
    .limit(1);

  if (!friendship) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  if (friendship.friendId !== user.id) {
    return NextResponse.json(
      { success: false, error: 'Only the recipient can respond to this request' },
      { status: 403 },
    );
  }

  if (friendship.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: 'This request has already been handled' },
      { status: 409 },
    );
  }

  const status = parsed.data.action === 'accept' ? 'accepted' : 'declined';

  const [updated] = await db
    .update(friendships)
    .set({ status })
    .where(eq(friendships.id, id))
    .returning();

  return NextResponse.json({ success: true, data: updated });
}

/**
 * DELETE /api/friends/[id] — remove a friend or cancel a request (either party).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.id, id),
        or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id)),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: deleted });
}
