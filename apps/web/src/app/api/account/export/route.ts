import { NextResponse } from 'next/server';
import {
  db,
  goals,
  habits,
  reflections,
  sessionNotes,
  studySessions,
  subjects,
  tasks,
} from '@studyflow/db';
import { eq, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/account/export — GDPR data export.
 * Returns all of the user's data as a downloadable JSON file.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [userSubjects, userSessions, userHabits, userGoals, userTasks, userReflections] =
    await Promise.all([
      db.select().from(subjects).where(eq(subjects.userId, user.id)),
      db.select().from(studySessions).where(eq(studySessions.userId, user.id)),
      db.select().from(habits).where(eq(habits.userId, user.id)),
      db.select().from(goals).where(eq(goals.userId, user.id)),
      db.select().from(tasks).where(eq(tasks.userId, user.id)),
      db.select().from(reflections).where(eq(reflections.userId, user.id)),
    ]);

  const sessionIds = userSessions.map((s) => s.id);
  const userSessionNotes =
    sessionIds.length > 0
      ? await db.select().from(sessionNotes).where(inArray(sessionNotes.sessionId, sessionIds))
      : [];

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      premiumTier: user.premiumTier,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    subjects: userSubjects,
    studySessions: userSessions,
    sessionNotes: userSessionNotes,
    habits: userHabits,
    goals: userGoals,
    tasks: userTasks,
    reflections: userReflections,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="studyflow-data.json"',
    },
  });
}
