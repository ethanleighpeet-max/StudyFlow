import { NextResponse } from 'next/server';
import { db, habits, studySessions, subjects } from '@studyflow/db';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface DayData {
  /** YYYY-MM-DD (UTC) */
  day: string;
  studyMinutes: number;
  sessionCount: number;
  avgFocus: number | null;
  sleepHours: number | null;
  waterGlasses: number;
  exerciseMinutes: number;
  mood: number | null;
}

interface Insight {
  id: string;
  headline: string;
  detail: string;
  kind: 'sleep' | 'exercise' | 'water' | 'pattern';
}

interface SubjectBreakdown {
  subjectId: string | null;
  name: string;
  color: string;
  minutes: number;
}

interface WeeklySummary {
  /** YYYY-MM-DD (UTC, Monday) */
  weekStart: string;
  studyMinutes: number;
  habitDays: number;
  avgFocus: number | null;
  bestDay: string | null;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * GET /api/insights — last 30 days of study + habit data joined per day,
 * plus computed correlation insights, subject breakdown, and weekly summaries.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 29);

  // Monday of the current (incomplete) week, UTC — anchor for completed weeks
  const currentWeekStart = new Date();
  currentWeekStart.setUTCHours(0, 0, 0, 0);
  currentWeekStart.setUTCDate(
    currentWeekStart.getUTCDate() - ((currentWeekStart.getUTCDay() + 6) % 7),
  );

  // The 4 most recent completed weeks can reach back further than 30 days
  const earliestWeekStart = new Date(currentWeekStart);
  earliestWeekStart.setUTCDate(earliestWeekStart.getUTCDate() - 28);
  const fetchSince = earliestWeekStart < since ? earliestWeekStart : since;

  const [sessions, habitLogs, subjectRows] = await Promise.all([
    db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, user.id),
          isNotNull(studySessions.endedAt),
          gte(studySessions.startedAt, fetchSince),
        ),
      ),
    db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, user.id), gte(habits.loggedAt, fetchSince))),
    db.select().from(subjects).where(eq(subjects.userId, user.id)),
  ]);

  // Build per-day map for the last 30 days
  const days = new Map<string, DayData>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dayKey(d);
    days.set(key, {
      day: key,
      studyMinutes: 0,
      sessionCount: 0,
      avgFocus: null,
      sleepHours: null,
      waterGlasses: 0,
      exerciseMinutes: 0,
      mood: null,
    });
  }

  // Aggregate sessions
  const focusByDay = new Map<string, number[]>();
  for (const session of sessions) {
    const key = dayKey(session.startedAt);
    const day = days.get(key);
    if (!day || !session.endedAt) continue;

    const minutes = Math.round(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 60000,
    );
    day.studyMinutes += minutes;
    day.sessionCount += 1;

    if (session.focusRating) {
      const list = focusByDay.get(key) ?? [];
      list.push(session.focusRating);
      focusByDay.set(key, list);
    }
  }
  for (const [key, ratings] of focusByDay) {
    const day = days.get(key);
    if (day) day.avgFocus = avg(ratings);
  }

  // Aggregate habits
  for (const log of habitLogs) {
    const key = dayKey(log.loggedAt);
    const day = days.get(key);
    if (!day) continue;

    switch (log.type) {
      case 'sleep':
        day.sleepHours = log.value; // latest wins is fine for prototype
        break;
      case 'water':
        day.waterGlasses += log.value;
        break;
      case 'exercise':
        day.exerciseMinutes += log.value;
        break;
      case 'mood':
        day.mood = log.value;
        break;
      default:
        break;
    }
  }

  const daily = Array.from(days.values());

  // ===== Correlation insights (observational, not causal) =====
  const insights: Insight[] = [];

  const withFocus = daily.filter((d) => d.avgFocus !== null);

  // Sleep vs focus
  const goodSleep = withFocus.filter((d) => d.sleepHours !== null && d.sleepHours >= 7);
  const poorSleep = withFocus.filter((d) => d.sleepHours !== null && d.sleepHours < 7);
  const goodSleepFocus = avg(goodSleep.map((d) => d.avgFocus ?? 0));
  const poorSleepFocus = avg(poorSleep.map((d) => d.avgFocus ?? 0));

  if (
    goodSleepFocus !== null &&
    poorSleepFocus !== null &&
    goodSleep.length >= 2 &&
    poorSleep.length >= 2 &&
    poorSleepFocus > 0
  ) {
    const delta = Math.round(((goodSleepFocus - poorSleepFocus) / poorSleepFocus) * 100);
    if (Math.abs(delta) >= 5) {
      insights.push({
        id: 'sleep-focus',
        kind: 'sleep',
        headline:
          delta > 0
            ? `You focus ${delta}% better after 7+ hours of sleep`
            : `Your focus dips ${Math.abs(delta)}% after 7+ hours of sleep`,
        detail: `Average focus rating: ${goodSleepFocus.toFixed(1)}/5 on well-rested days vs ${poorSleepFocus.toFixed(1)}/5 on short-sleep days (${goodSleep.length + poorSleep.length} days compared).`,
      });
    }
  }

  // Exercise vs focus
  const activeDays = withFocus.filter((d) => d.exerciseMinutes >= 15);
  const inactiveDays = withFocus.filter((d) => d.exerciseMinutes < 15);
  const activeFocus = avg(activeDays.map((d) => d.avgFocus ?? 0));
  const inactiveFocus = avg(inactiveDays.map((d) => d.avgFocus ?? 0));

  if (
    activeFocus !== null &&
    inactiveFocus !== null &&
    activeDays.length >= 2 &&
    inactiveDays.length >= 2 &&
    inactiveFocus > 0
  ) {
    const delta = Math.round(((activeFocus - inactiveFocus) / inactiveFocus) * 100);
    if (Math.abs(delta) >= 5) {
      insights.push({
        id: 'exercise-focus',
        kind: 'exercise',
        headline:
          delta > 0
            ? `Focus is ${delta}% higher on days you exercise`
            : `Focus is ${Math.abs(delta)}% lower on days you exercise`,
        detail: `Average focus: ${activeFocus.toFixed(1)}/5 on active days vs ${inactiveFocus.toFixed(1)}/5 on rest days.`,
      });
    }
  }

  // Best study day of the week
  const byWeekday = new Map<number, number[]>();
  for (const d of daily) {
    if (d.studyMinutes > 0) {
      const weekday = new Date(`${d.day}T12:00:00Z`).getUTCDay();
      const list = byWeekday.get(weekday) ?? [];
      list.push(d.studyMinutes);
      byWeekday.set(weekday, list);
    }
  }
  if (byWeekday.size >= 3) {
    let bestDay = -1;
    let bestAvg = 0;
    for (const [weekday, minutes] of byWeekday) {
      const a = avg(minutes) ?? 0;
      if (a > bestAvg) {
        bestAvg = a;
        bestDay = weekday;
      }
    }
    if (bestDay >= 0) {
      insights.push({
        id: 'best-day',
        kind: 'pattern',
        headline: `${WEEKDAY_NAMES[bestDay]} is your strongest study day`,
        detail: `You average ${Math.round(bestAvg)} minutes of focused study on ${WEEKDAY_NAMES[bestDay]}s.`,
      });
    }
  }

  // ===== Study minutes by subject (last 30 days, completed sessions) =====
  const subjectMeta = new Map(subjectRows.map((s) => [s.id, { name: s.name, color: s.color }]));
  const minutesBySubject = new Map<string | null, number>();
  for (const session of sessions) {
    if (!session.endedAt || session.startedAt < since) continue;
    const minutes = Math.round(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 60000,
    );
    const key = session.subjectId;
    minutesBySubject.set(key, (minutesBySubject.get(key) ?? 0) + minutes);
  }
  const bySubject: SubjectBreakdown[] = Array.from(minutesBySubject.entries())
    .map(([subjectId, minutes]) => {
      const meta = subjectId !== null ? subjectMeta.get(subjectId) : undefined;
      return {
        subjectId,
        name: meta?.name ?? 'No subject',
        color: meta?.color ?? '#A8A29E',
        minutes,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  // ===== Weekly summaries (last 4 completed Mon–Sun weeks, most recent first) =====
  const weeklySummaries: WeeklySummary[] = [];
  for (let w = 1; w <= 4; w++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7 * w);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    let studyMinutes = 0;
    const focusRatings: number[] = [];
    const minutesByWeekdayInWeek = new Map<number, number>();
    for (const session of sessions) {
      if (!session.endedAt) continue;
      if (session.startedAt < weekStart || session.startedAt >= weekEnd) continue;
      const minutes = Math.round(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 60000,
      );
      studyMinutes += minutes;
      const weekday = session.startedAt.getUTCDay();
      minutesByWeekdayInWeek.set(weekday, (minutesByWeekdayInWeek.get(weekday) ?? 0) + minutes);
      if (session.focusRating) focusRatings.push(session.focusRating);
    }

    const habitDayKeys = new Set<string>();
    for (const log of habitLogs) {
      if (log.loggedAt >= weekStart && log.loggedAt < weekEnd) {
        habitDayKeys.add(dayKey(log.loggedAt));
      }
    }

    let bestDay: string | null = null;
    let bestDayMinutes = 0;
    for (const [weekday, minutes] of minutesByWeekdayInWeek) {
      if (minutes > bestDayMinutes) {
        bestDayMinutes = minutes;
        bestDay = WEEKDAY_NAMES[weekday] ?? null;
      }
    }

    const weekFocusAvg = avg(focusRatings);
    weeklySummaries.push({
      weekStart: dayKey(weekStart),
      studyMinutes,
      habitDays: habitDayKeys.size,
      avgFocus: weekFocusAvg !== null ? Math.round(weekFocusAvg * 10) / 10 : null,
      bestDay,
    });
  }

  // ===== 4-week averages =====
  const avgWeeklyMinutes = avg(weeklySummaries.map((s) => s.studyMinutes)) ?? 0;
  const avgHabitDays = avg(weeklySummaries.map((s) => s.habitDays)) ?? 0;
  const avgWeeklyFocus = avg(
    weeklySummaries.filter((s) => s.avgFocus !== null).map((s) => s.avgFocus ?? 0),
  );
  const averages = {
    weeklyMinutes: Math.round(avgWeeklyMinutes),
    habitDaysPerWeek: Math.round(avgHabitDays * 10) / 10,
    avgFocus: avgWeeklyFocus !== null ? Math.round(avgWeeklyFocus * 10) / 10 : null,
  };

  // ===== Weekly totals =====
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const thisWeekMinutes = last7.reduce((s, d) => s + d.studyMinutes, 0);
  const lastWeekMinutes = prev7.reduce((s, d) => s + d.studyMinutes, 0);
  const habitDays = last7.filter(
    (d) =>
      d.sleepHours !== null || d.waterGlasses > 0 || d.exerciseMinutes > 0 || d.mood !== null,
  ).length;
  const weekFocus = avg(last7.filter((d) => d.avgFocus !== null).map((d) => d.avgFocus ?? 0));

  return NextResponse.json({
    success: true,
    data: {
      daily,
      insights,
      totals: {
        thisWeekMinutes,
        lastWeekMinutes,
        habitDays,
        avgFocus: weekFocus !== null ? Math.round(weekFocus * 10) / 10 : null,
      },
      bySubject,
      weeklySummaries,
      averages,
    },
  });
}
