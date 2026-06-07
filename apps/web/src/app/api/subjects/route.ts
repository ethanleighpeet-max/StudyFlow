import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, subjects } from '@studyflow/db';
import { TIER_LIMITS } from '@studyflow/shared';
import { count, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const createSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.userId, user.id))
    .orderBy(subjects.name);

  return NextResponse.json({ success: true, data: userSubjects });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSubjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  // Free-tier limit enforcement
  if (user.premiumTier === 'free') {
    const [row] = await db
      .select({ total: count() })
      .from(subjects)
      .where(eq(subjects.userId, user.id));

    if ((row?.total ?? 0) >= TIER_LIMITS.free.maxSubjects) {
      return NextResponse.json(
        {
          success: false,
          error: 'Free plan is limited to 5 subjects. Upgrade to Pro for unlimited.',
          code: 'TIER_LIMIT',
        },
        { status: 403 },
      );
    }
  }

  const [subject] = await db
    .insert(subjects)
    .values({
      userId: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? '#6366F1',
      icon: parsed.data.icon ?? null,
    })
    .returning();

  return NextResponse.json({ success: true, data: subject }, { status: 201 });
}
