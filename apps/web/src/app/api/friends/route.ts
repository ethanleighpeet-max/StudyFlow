import { NextResponse } from 'next/server';
import { db, friendships, users } from '@studyflow/db';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const sendRequestSchema = z.object({
  userId: z.string().uuid(),
});

interface FriendEntry {
  /** Friendship row id */
  id: string;
  /** The other user's id */
  userId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * GET /api/friends — the user's friendships split into
 * { friends (accepted), incoming (pending, I'm the receiver), outgoing (pending, I sent it) }.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Friendships I initiated — join the receiving user's profile
  const initiated = await db
    .select({
      id: friendships.id,
      status: friendships.status,
      createdAt: friendships.createdAt,
      otherId: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.friendId, users.id))
    .where(eq(friendships.userId, user.id));

  // Friendships where I'm the receiver — join the initiator's profile
  const received = await db
    .select({
      id: friendships.id,
      status: friendships.status,
      createdAt: friendships.createdAt,
      otherId: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.userId, users.id))
    .where(eq(friendships.friendId, user.id));

  const toEntry = (row: (typeof initiated)[number]): FriendEntry => ({
    id: row.id,
    userId: row.otherId,
    name: row.name,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  });

  const friends: FriendEntry[] = [
    ...initiated.filter((r) => r.status === 'accepted').map(toEntry),
    ...received.filter((r) => r.status === 'accepted').map(toEntry),
  ];
  const incoming: FriendEntry[] = received.filter((r) => r.status === 'pending').map(toEntry);
  const outgoing: FriendEntry[] = initiated.filter((r) => r.status === 'pending').map(toEntry);

  return NextResponse.json({ success: true, data: { friends, incoming, outgoing } });
}

/**
 * POST /api/friends — send a friend request { userId }.
 * Guards: not self, target exists, no duplicate in either direction.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const targetId = parsed.data.userId;

  if (targetId === user.id) {
    return NextResponse.json(
      { success: false, error: 'You cannot add yourself as a friend' },
      { status: 400 },
    );
  }

  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);

  if (!target) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  // Duplicate guard — either direction
  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userId, user.id), eq(friendships.friendId, targetId)),
        and(eq(friendships.userId, targetId), eq(friendships.friendId, user.id)),
      ),
    );

  const active = existing.find((f) => f.status !== 'declined');
  if (active) {
    const message =
      active.status === 'accepted'
        ? 'You are already friends'
        : 'A friend request between you already exists';
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }

  // Clear any old declined rows so the pair can reconnect
  for (const stale of existing) {
    await db.delete(friendships).where(eq(friendships.id, stale.id));
  }

  const [created] = await db
    .insert(friendships)
    .values({ userId: user.id, friendId: targetId, status: 'pending' })
    .returning();

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
