import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const mockUpgradeSchema = z.object({
  tier: z.enum(['free', 'pro']).default('pro'),
});

/**
 * POST /api/billing/mock-upgrade — demo checkout, no payment taken.
 * Sets users.premiumTier to the requested tier ('pro' by default,
 * 'free' for a mock downgrade).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = mockUpgradeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(users)
    .set({ premiumTier: parsed.data.tier, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, premiumTier: users.premiumTier });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { premiumTier: updated.premiumTier } });
}
