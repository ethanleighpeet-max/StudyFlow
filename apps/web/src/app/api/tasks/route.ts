import { NextResponse } from 'next/server';
import { db, subjects, tasks } from '@studyflow/db';
import { createTaskSchema } from '@studyflow/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/tasks — all tasks for the user, incomplete first, then by due date.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      subjectId: tasks.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(tasks)
    .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
    .where(eq(tasks.userId, user.id))
    .orderBy(
      sql`${tasks.completedAt} is not null`,
      sql`${tasks.dueDate} asc nulls last`,
      asc(tasks.createdAt),
    );

  return NextResponse.json({ success: true, data: userTasks });
}

/**
 * POST /api/tasks — create a task.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      subjectId: parsed.data.subjectId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority,
    })
    .returning();

  return NextResponse.json({ success: true, data: task }, { status: 201 });
}
