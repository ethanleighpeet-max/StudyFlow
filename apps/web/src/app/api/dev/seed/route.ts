import { NextResponse } from 'next/server';
import { db, habits, studySessions, subjects, tasks } from '@studyflow/db';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/dev/seed?confirm=yes — seed 14 days of realistic demo data
 * for the signed-in user. Prototype/demo helper.
 *
 * Sleep and focus are intentionally correlated so the Insights page
 * has a real pattern to surface.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  if (searchParams.get('confirm') !== 'yes') {
    return NextResponse.json({
      success: false,
      error: 'Add ?confirm=yes to seed 14 days of demo data for your account.',
    });
  }

  // Refuse to double-seed unless forced
  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studySessions)
    .where(eq(studySessions.userId, user.id));

  if ((existing?.count ?? 0) > 20 && searchParams.get('force') !== 'yes') {
    return NextResponse.json({
      success: false,
      error: `You already have ${existing?.count} sessions. Add &force=yes to seed anyway.`,
    });
  }

  // Ensure demo subjects exist
  const existingSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.userId, user.id));

  const wanted = [
    { name: 'Statistics', color: '#0F8B8D' },
    { name: 'Microeconomics', color: '#7C6FAE' },
    { name: 'Business English', color: '#E09F3E' },
  ];

  const subjectIds: string[] = existingSubjects.map((s) => s.id);
  for (const w of wanted) {
    if (!existingSubjects.some((s) => s.name === w.name)) {
      const [created] = await db
        .insert(subjects)
        .values({ userId: user.id, name: w.name, color: w.color })
        .returning();
      if (created) subjectIds.push(created.id);
    }
  }

  if (subjectIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Could not create demo subjects' },
      { status: 500 },
    );
  }

  const moods = ['focused', 'calm', 'energized', 'tired', 'distracted'];
  const goalsTexts = [
    'Finish chapter exercises',
    'Review lecture notes',
    'Prepare flashcards',
    'Practice past exam questions',
    null,
  ];

  let sessionsCreated = 0;
  let habitsCreated = 0;

  // Deterministic-ish pseudo-random so reseeding looks similar
  let seedState = 42;
  const rand = (): number => {
    seedState = (seedState * 9301 + 49297) % 233280;
    return seedState / 233280;
  };
  const pick = <T,>(arr: readonly T[]): T => {
    const item = arr[Math.floor(rand() * arr.length)];
    return item as T;
  };

  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const day = new Date();
    day.setDate(day.getDate() - daysAgo);

    // --- Habits ---
    // Sleep: two "bad sleep" stretches to create contrast
    const badSleepDay = daysAgo === 11 || daysAgo === 10 || daysAgo === 4 || daysAgo === 3;
    const sleepHours = badSleepDay ? 5 + Math.round(rand() * 3) / 2 : 7 + Math.round(rand() * 4) / 2;

    const morning = new Date(day);
    morning.setHours(8, 30 + Math.floor(rand() * 40), 0, 0);

    await db.insert(habits).values({
      userId: user.id,
      type: 'sleep',
      value: sleepHours,
      loggedAt: morning,
    });
    habitsCreated++;

    // Water: 3-9 glasses through the day
    const glasses = 3 + Math.floor(rand() * 7);
    for (let g = 0; g < glasses; g++) {
      const t = new Date(day);
      t.setHours(9 + Math.floor((g / glasses) * 12), Math.floor(rand() * 59), 0, 0);
      await db.insert(habits).values({
        userId: user.id,
        type: 'water',
        value: 1,
        loggedAt: t,
      });
      habitsCreated++;
    }

    // Exercise: ~60% of days
    if (rand() < 0.6) {
      const t = new Date(day);
      t.setHours(17, 30, 0, 0);
      await db.insert(habits).values({
        userId: user.id,
        type: 'exercise',
        value: pick([15, 30, 30, 45, 60] as const),
        loggedAt: t,
      });
      habitsCreated++;
    }

    // Mood: correlated with sleep
    const evening = new Date(day);
    evening.setHours(21, 0, 0, 0);
    const moodValue = badSleepDay
      ? 2 + Math.floor(rand() * 2)
      : 3 + Math.floor(rand() * 3);
    await db.insert(habits).values({
      userId: user.id,
      type: 'mood',
      value: Math.min(moodValue, 5),
      loggedAt: evening,
    });
    habitsCreated++;

    // --- Study sessions: 1-3 per day, skip ~1 day per week ---
    if (rand() < 0.12) continue;

    const sessionCount = 1 + Math.floor(rand() * 2.4);
    for (let s = 0; s < sessionCount; s++) {
      const start = new Date(day);
      start.setHours(10 + s * 4 + Math.floor(rand() * 2), Math.floor(rand() * 50), 0, 0);
      const durationMin = 35 + Math.floor(rand() * 75);
      const end = new Date(start.getTime() + durationMin * 60000);

      // Focus correlated with sleep: good sleep → 3-5, bad sleep → 1-3
      const focusRating = badSleepDay
        ? 1 + Math.floor(rand() * 3)
        : 3 + Math.floor(rand() * 3);

      await db.insert(studySessions).values({
        userId: user.id,
        subjectId: pick(subjectIds),
        startedAt: start,
        endedAt: end,
        timerMode: pick(['pomodoro', 'custom', 'open-ended'] as const),
        timerDurationMinutes: durationMin,
        focusRating: Math.min(focusRating, 5),
        mood: pick(moods),
        sessionGoal: pick(goalsTexts),
      });
      sessionsCreated++;
    }
  }

  // A few demo tasks
  const demoTasks = [
    { title: 'Finish statistics problem set 4', offsetDays: 1, priority: 'high' as const },
    { title: 'Read micro chapter 7', offsetDays: 2, priority: 'medium' as const },
    { title: 'Draft presentation outline', offsetDays: 5, priority: 'medium' as const },
    { title: 'Book group study room', offsetDays: 0, priority: 'low' as const },
  ];

  let tasksCreated = 0;
  for (const t of demoTasks) {
    const due = new Date();
    due.setDate(due.getDate() + t.offsetDays);
    due.setHours(23, 59, 0, 0);
    await db.insert(tasks).values({
      userId: user.id,
      subjectId: pick(subjectIds),
      title: t.title,
      dueDate: due,
      priority: t.priority,
    });
    tasksCreated++;
  }

  return NextResponse.json({
    success: true,
    data: {
      sessionsCreated,
      habitsCreated,
      tasksCreated,
      message: 'Demo data seeded. Check the dashboard, habits, and insights pages.',
    },
  });
}
