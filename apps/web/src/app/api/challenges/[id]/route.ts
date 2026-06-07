import { NextResponse } from 'next/server';
import { db, challengeMembers, groupChallenges } from '@studyflow/db';
import { SOCIAL } from '@studyflow/shared';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const actionSchema = z.object({
  action: z.literal('join'),
});

/**
 * POST /api/challenges/[id] — { action: 'join' } joins the challenge.
 * Guards: challenge exists, not ended, not already a member, group not full.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const [challenge] = await db
    .select()
    .from(groupChallenges)
    .where(eq(groupChallenges.id, id))
    .limit(1);

  if (!challenge) {
    return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
  }

  if (challenge.endDate <= new Date()) {
    return NextResponse.json(
      { success: false, error: 'This challenge has already ended' },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(challengeMembers)
    .where(and(eq(challengeMembers.challengeId, id), eq(challengeMembers.userId, user.id)))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You are already in this challenge' },
      { status: 409 },
    );
  }

  const [memberRow] = await db
    .select({ total: count() })
    .from(challengeMembers)
    .where(eq(challengeMembers.challengeId, id));

  if ((memberRow?.total ?? 0) >= SOCIAL.MAX_GROUP_SIZE) {
    return NextResponse.json(
      { success: false, error: `This challenge is full (max ${SOCIAL.MAX_GROUP_SIZE} members)` },
      { status: 403 },
    );
  }

  const [member] = await db
    .insert(challengeMembers)
    .values({ challengeId: id, userId: user.id })
    .returning();

  return NextResponse.json({ success: true, data: member }, { status: 201 });
}

/**
 * DELETE /api/challenges/[id] — leave the challenge.
 * If nobody remains, the challenge row is deleted too.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [removed] = await db
    .delete(challengeMembers)
    .where(and(eq(challengeMembers.challengeId, id), eq(challengeMembers.userId, user.id)))
    .returning();

  if (!removed) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const [remaining] = await db
    .select({ total: count() })
    .from(challengeMembers)
    .where(eq(challengeMembers.challengeId, id));

  if ((remaining?.total ?? 0) === 0) {
    await db.delete(groupChallenges).where(eq(groupChallenges.id, id));
  }

  return NextResponse.json({ success: true, data: removed });
}
