import { NextResponse } from 'next/server';
import { db, challengeMembers, groupChallenges, studySessions, users } from '@studyflow/db';
import { SOCIAL } from '@studyflow/shared';
import { and, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const createChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  targetHours: z.number().positive().max(168),
  endDate: z.string().datetime(),
});

interface ChallengeMemberProgress {
  userId: string;
  name: string;
  hours: number;
}

interface ChallengeWithProgress {
  id: string;
  name: string;
  targetHours: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  memberCount: number;
  totalHours: number;
  members: ChallengeMemberProgress[];
}

/**
 * GET /api/challenges — challenges I'm a member of, with collective progress.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const myMemberships = await db
    .select({ challengeId: challengeMembers.challengeId })
    .from(challengeMembers)
    .where(eq(challengeMembers.userId, user.id));

  const challengeIds = myMemberships.map((m) => m.challengeId);

  if (challengeIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const challenges = await db
    .select()
    .from(groupChallenges)
    .where(inArray(groupChallenges.id, challengeIds))
    .orderBy(groupChallenges.endDate);

  const data: ChallengeWithProgress[] = await Promise.all(
    challenges.map(async (challenge) => {
      const members = await db
        .select({
          userId: challengeMembers.userId,
          name: users.name,
        })
        .from(challengeMembers)
        .innerJoin(users, eq(challengeMembers.userId, users.id))
        .where(eq(challengeMembers.challengeId, challenge.id))
        .orderBy(challengeMembers.joinedAt);

      const memberIds = members.map((m) => m.userId);

      const rows =
        memberIds.length > 0
          ? await db
              .select({
                userId: studySessions.userId,
                minutes: sql<number>`coalesce(sum(extract(epoch from (${studySessions.endedAt} - ${studySessions.startedAt})) / 60), 0)::int`,
              })
              .from(studySessions)
              .where(
                and(
                  inArray(studySessions.userId, memberIds),
                  isNotNull(studySessions.endedAt),
                  gte(studySessions.startedAt, challenge.startDate),
                  lte(studySessions.startedAt, challenge.endDate),
                ),
              )
              .groupBy(studySessions.userId)
          : [];

      const minutesByUser = new Map(rows.map((r) => [r.userId, r.minutes]));

      const memberProgress: ChallengeMemberProgress[] = members.map((m) => ({
        userId: m.userId,
        name: m.name,
        hours: Math.round(((minutesByUser.get(m.userId) ?? 0) / 60) * 10) / 10,
      }));

      const totalHours =
        Math.round(memberProgress.reduce((sum, m) => sum + m.hours, 0) * 10) / 10;

      return {
        id: challenge.id,
        name: challenge.name,
        targetHours: challenge.targetHours,
        startDate: challenge.startDate.toISOString(),
        endDate: challenge.endDate.toISOString(),
        createdBy: challenge.createdBy,
        memberCount: memberProgress.length,
        totalHours,
        members: memberProgress,
      };
    }),
  );

  return NextResponse.json({ success: true, data });
}

/**
 * POST /api/challenges — create a challenge (startDate = now) and join it.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createChallengeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const now = new Date();
  const endDate = new Date(parsed.data.endDate);

  if (endDate <= now) {
    return NextResponse.json(
      { success: false, error: 'End date must be in the future' },
      { status: 400 },
    );
  }

  const maxEnd = new Date(now.getTime() + SOCIAL.MAX_CHALLENGE_DAYS * 86400000);
  if (endDate > maxEnd) {
    return NextResponse.json(
      {
        success: false,
        error: `Challenges can run for at most ${SOCIAL.MAX_CHALLENGE_DAYS} days`,
      },
      { status: 400 },
    );
  }

  const [challenge] = await db
    .insert(groupChallenges)
    .values({
      name: parsed.data.name,
      targetHours: parsed.data.targetHours,
      startDate: now,
      endDate,
      createdBy: user.id,
    })
    .returning();

  if (!challenge) {
    return NextResponse.json(
      { success: false, error: 'Failed to create challenge' },
      { status: 500 },
    );
  }

  await db.insert(challengeMembers).values({ challengeId: challenge.id, userId: user.id });

  return NextResponse.json({ success: true, data: challenge }, { status: 201 });
}
