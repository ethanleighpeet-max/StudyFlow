import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, subjects } from '@studyflow/db';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/**
 * PATCH /api/subjects/[id] — rename or recolor a subject.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSubjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const updates: Partial<typeof subjects.$inferInsert> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.color !== undefined) {
    updates.color = parsed.data.color;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(subjects)
    .set(updates)
    .where(and(eq(subjects.id, id), eq(subjects.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}

/**
 * DELETE /api/subjects/[id] — delete a subject.
 * Study sessions keep their history: subject_id is ON DELETE SET NULL.
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
    .delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: deleted });
}
