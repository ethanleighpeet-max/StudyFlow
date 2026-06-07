import { NextResponse } from 'next/server';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const updatePreferencesSchema = z.object({
  waterTarget: z.number().int().min(1).max(20).optional(),
  shareActivity: z.boolean().optional(),
});

/**
 * GET /api/preferences — the current user's preferences object.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: user.preferences });
}

/**
 * PATCH /api/preferences — merge partial preferences { waterTarget?, shareActivity? } into users.preferences.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updatePreferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const merged: Record<string, unknown> = { ...user.preferences };
  if (parsed.data.waterTarget !== undefined) {
    merged.waterTarget = parsed.data.waterTarget;
  }
  if (parsed.data.shareActivity !== undefined) {
    merged.shareActivity = parsed.data.shareActivity;
  }

  const [updated] = await db
    .update(users)
    .set({ preferences: merged, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ preferences: users.preferences });

  return NextResponse.json({ success: true, data: updated?.preferences ?? merged });
}
