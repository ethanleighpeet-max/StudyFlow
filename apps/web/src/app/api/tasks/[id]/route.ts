import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, tasks } from '@studyflow/db';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const updateTaskSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

/**
 * PATCH /api/tasks/[id] — toggle completion or edit title/priority.
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
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const updates: Partial<typeof tasks.$inferInsert> = {};
  if (parsed.data.completed !== undefined) {
    updates.completedAt = parsed.data.completed ? new Date() : null;
  }
  if (parsed.data.title !== undefined) {
    updates.title = parsed.data.title;
  }
  if (parsed.data.priority !== undefined) {
    updates.priority = parsed.data.priority;
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}

/**
 * DELETE /api/tasks/[id]
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
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: deleted });
}
