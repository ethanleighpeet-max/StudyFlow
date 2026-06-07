'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Brain, Clock, Dumbbell, Heart, Moon, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface DayData {
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
  weekStart: string;
  studyMinutes: number;
  habitDays: number;
  avgFocus: number | null;
  bestDay: string | null;
}

interface InsightsData {
  daily: DayData[];
  insights: Insight[];
  totals: {
    thisWeekMinutes: number;
    lastWeekMinutes: number;
    habitDays: number;
    avgFocus: number | null;
  };
  bySubject: SubjectBreakdown[];
  weeklySummaries: WeeklySummary[];
  averages: {
    weeklyMinutes: number;
    habitDaysPerWeek: number;
    avgFocus: number | null;
  };
}

// Static icon/color maps
const insightStyles: Record<Insight['kind'], { icon: LucideIcon; iconBg: string; iconColor: string }> = {
  sleep: { icon: Moon, iconBg: 'bg-secondary-100', iconColor: 'text-secondary-600' },
  exercise: { icon: Dumbbell, iconBg: 'bg-accent-100', iconColor: 'text-accent-600' },
  water: { icon: Heart, iconBg: 'bg-brand-100', iconColor: 'text-brand-600' },
  pattern: { icon: Sparkles, iconBg: 'bg-brand-100', iconColor: 'text-brand-600' },
};

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' } as const;
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`;
}

export function InsightsView() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.error ?? 'Failed to load insights');
      })
      .catch(() => setError('Failed to load insights'))
      .finally(() => setLoading(false));
  }, []);

  const last14 = useMemo(() => data?.daily.slice(-14) ?? [], [data]);
  const hasAnyStudy = useMemo(() => last14.some((d) => d.studyMinutes > 0), [last14]);
  const hasAnyHabits = useMemo(
    () =>
      data?.daily.some(
        (d) => d.sleepHours !== null || d.waterGlasses > 0 || d.exerciseMinutes > 0,
      ) ?? false,
    [data],
  );
  const hasWeeklyData = useMemo(
    () => data?.weeklySummaries.some((w) => w.studyMinutes > 0 || w.habitDays > 0) ?? false,
    [data],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-surface-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error ?? 'Something went wrong'}
        </div>
      </div>
    );
  }

  const { totals, insights } = data;
  const weekDelta =
    totals.lastWeekMinutes > 0
      ? Math.round(
          ((totals.thisWeekMinutes - totals.lastWeekMinutes) / totals.lastWeekMinutes) * 100,
        )
      : null;

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-surface-900">Insights</h1>
        <p className="text-sm text-surface-500">How your habits shape your studying</p>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={Clock}
          label="Study this week"
          value={formatHours(totals.thisWeekMinutes)}
          sub={
            weekDelta !== null
              ? `${weekDelta >= 0 ? '+' : ''}${weekDelta}% vs last week`
              : 'First week tracked'
          }
          positive={weekDelta === null || weekDelta >= 0}
        />
        <SummaryCard
          icon={Brain}
          label="Avg focus"
          value={totals.avgFocus !== null ? `${totals.avgFocus}/5` : '--'}
          sub="Past 7 days"
          positive
        />
        <SummaryCard
          icon={Heart}
          label="Habit days"
          value={`${totals.habitDays}/7`}
          sub="Days with logs"
          positive={totals.habitDays >= 4}
        />
        <SummaryCard
          icon={BarChart3}
          label="Data points"
          value={String(
            data.daily.reduce(
              (s, d) =>
                s +
                d.sessionCount +
                (d.sleepHours !== null ? 1 : 0) +
                (d.mood !== null ? 1 : 0) +
                (d.waterGlasses > 0 ? 1 : 0) +
                (d.exerciseMinutes > 0 ? 1 : 0),
              0,
            ),
          )}
          sub="Past 30 days"
          positive
        />
      </div>

      {/* Correlation insights */}
      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const s = insightStyles[insight.kind];
            const Icon = s.icon;
            return (
              <motion.div
                key={insight.id}
                className="flex items-start gap-4 rounded-2xl border border-surface-200 bg-gradient-to-r from-white to-surface-50/50 p-5 shadow-soft"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, ...gentleSpring }}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-surface-900">
                    {insight.headline}
                  </h3>
                  <p className="mt-1 text-sm text-surface-500">{insight.detail}</p>
                </div>
              </motion.div>
            );
          })}
          <p className="px-1 text-xs text-surface-300">
            Insights are observational patterns from your own data, not causal claims.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-200 bg-white p-6 text-center">
          <p className="text-sm text-surface-500">
            Log a few more study sessions and habits — insights appear once there&apos;s enough
            data to compare good and bad days.
          </p>
        </div>
      )}

      {/* Study + sleep chart */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Study time &amp; sleep — last 14 days
          </h2>
          <div className="flex items-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-400" /> Study
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-secondary-400" /> Sleep
            </span>
          </div>
        </div>

        {hasAnyStudy ? (
          <StudySleepChart days={last14} />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-surface-400">
            No study sessions in the last two weeks yet.
          </div>
        )}
      </div>

      {/* Study time by subject */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
        <h2 className="font-heading text-base font-semibold text-surface-900">
          Study time by subject
        </h2>
        <p className="text-xs text-surface-400">Past 30 days</p>
        {data.bySubject.length > 0 ? (
          <SubjectBreakdownBars subjects={data.bySubject} />
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-surface-400">
            Complete a study session to see where your time goes.
          </div>
        )}
      </div>

      {/* Habit trends */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Habit trends — last 30 days
          </h2>
          <div className="flex items-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-secondary-400" /> Sleep
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-brand-400" /> Water
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-accent-400" /> Exercise
            </span>
          </div>
        </div>
        {hasAnyHabits ? (
          <HabitTrendsChart days={data.daily} />
        ) : (
          <div className="flex h-44 items-center justify-center text-sm text-surface-400">
            Log sleep, water, or exercise to see your habit trends.
          </div>
        )}
      </div>

      {/* Weekly summaries */}
      <div className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Weekly summaries
          </h2>
          <p className="text-xs text-surface-400">
            Your last {data.weeklySummaries.length} completed weeks, most recent first
          </p>
        </div>
        {hasWeeklyData ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.weeklySummaries.map((week, i) => (
              <WeeklySummaryCard
                key={week.weekStart}
                week={week}
                avgWeeklyMinutes={data.averages.weeklyMinutes}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-200 bg-white p-6 text-center">
            <p className="text-sm text-surface-500">
              Finish a full week of studying or habit tracking and your weekly recaps will
              collect here.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  positive,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  positive: boolean;
}) {
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      className="rounded-2xl border border-surface-200 bg-white p-4 shadow-soft"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-2 text-surface-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-sans text-xl font-bold tabular-nums text-surface-900">{value}</p>
      <p
        className={`mt-0.5 flex items-center gap-1 text-xs ${
          positive ? 'text-brand-500' : 'text-accent-600'
        }`}
      >
        <TrendIcon className="h-3 w-3" />
        {sub}
      </p>
    </motion.div>
  );
}

/**
 * Hand-rolled SVG chart: study minutes as bars, sleep hours as a line.
 * No chart library needed — keeps the bundle lean and the style on-brand.
 */
function StudySleepChart({ days }: { days: DayData[] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxStudy = Math.max(60, ...days.map((d) => d.studyMinutes));
  const maxSleep = 10;

  const barW = (chartW / days.length) * 0.55;
  const slotW = chartW / days.length;

  const sleepPoints = days
    .map((d, i) => {
      if (d.sleepHours === null) return null;
      const x = padding.left + i * slotW + slotW / 2;
      const y = padding.top + chartH - (Math.min(d.sleepHours, maxSleep) / maxSleep) * chartH;
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const linePath = sleepPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-4 w-full"
      role="img"
      aria-label="Bar chart of daily study minutes with sleep hours overlay"
    >
      {/* Baseline */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={width - padding.right}
        y2={padding.top + chartH}
        stroke="#E7E5E4"
        strokeWidth={1}
      />

      {/* Study bars */}
      {days.map((d, i) => {
        const barH = (d.studyMinutes / maxStudy) * chartH;
        const x = padding.left + i * slotW + (slotW - barW) / 2;
        const y = padding.top + chartH - barH;
        const label = new Date(`${d.day}T12:00:00Z`).toLocaleDateString('en-GB', {
          day: 'numeric',
        });

        return (
          <g key={d.day}>
            <motion.rect
              x={x}
              width={barW}
              rx={4}
              fill={d.studyMinutes > 0 ? '#2BA6A8' : '#F5F5F4'}
              initial={{ height: 0, y: padding.top + chartH }}
              animate={{ height: Math.max(barH, d.studyMinutes > 0 ? 4 : 2), y }}
              transition={{ delay: i * 0.04, ...gentleSpring }}
            />
            {d.studyMinutes > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-surface-400"
                fontSize={10}
                fontFamily="var(--font-sans, Inter, sans-serif)"
              >
                {Math.round(d.studyMinutes)}
              </text>
            )}
            <text
              x={padding.left + i * slotW + slotW / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-surface-300"
              fontSize={10}
              fontFamily="var(--font-sans, Inter, sans-serif)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Sleep line */}
      {sleepPoints.length >= 2 && (
        <motion.path
          d={linePath}
          fill="none"
          stroke="#7C6FAE"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
        />
      )}
      {sleepPoints.map((p) => (
        <motion.circle
          key={`${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#7C6FAE"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, ...gentleSpring }}
        />
      ))}
    </svg>
  );
}

/**
 * Horizontal bars of study minutes per subject — color dot, name, animated bar.
 */
function SubjectBreakdownBars({ subjects }: { subjects: SubjectBreakdown[] }) {
  const top = subjects.slice(0, 6);
  const max = Math.max(1, ...top.map((s) => s.minutes));

  return (
    <div className="mt-4 space-y-3">
      {top.map((subject, i) => (
        <div key={subject.subjectId ?? 'no-subject'} className="flex items-center gap-3">
          <div className="flex w-32 shrink-0 items-center gap-2 sm:w-40">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            <span className="truncate text-sm text-surface-600">{subject.name}</span>
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-100">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: subject.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((subject.minutes / max) * 100, 2)}%` }}
              transition={{ delay: 0.1 + i * 0.06, ...gentleSpring }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-sans text-sm font-medium tabular-nums text-surface-700">
            {formatHours(subject.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ChartPoint {
  x: number;
  y: number;
}

function lineSegments(points: (ChartPoint | null)[]): string[] {
  const segments: string[] = [];
  let current: ChartPoint[] = [];
  const flush = () => {
    if (current.length >= 2) {
      segments.push(
        current
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' '),
      );
    }
    current = [];
  };
  for (const p of points) {
    if (p === null) flush();
    else current.push(p);
  }
  flush();
  return segments;
}

/**
 * Hand-rolled SVG line chart: sleep, water, and exercise over 30 days,
 * each normalized to its own max so they share one canvas. Days without
 * data for a metric break that metric's line.
 */
function HabitTrendsChart({ days }: { days: DayData[] }) {
  const width = 720;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const slotW = chartW / Math.max(days.length, 1);

  const toPoints = (value: (d: DayData) => number | null): (ChartPoint | null)[] => {
    const values = days.map(value);
    const max = Math.max(1, ...values.filter((v): v is number => v !== null));
    return values.map((v, i) => {
      if (v === null) return null;
      return {
        x: padding.left + i * slotW + slotW / 2,
        y: padding.top + chartH - (Math.min(v, max) / max) * chartH,
      };
    });
  };

  const series = [
    { id: 'sleep', color: '#7C6FAE', points: toPoints((d) => d.sleepHours) },
    {
      id: 'water',
      color: '#2BA6A8',
      points: toPoints((d) => (d.waterGlasses > 0 ? d.waterGlasses : null)),
    },
    {
      id: 'exercise',
      color: '#E09F3E',
      points: toPoints((d) => (d.exerciseMinutes > 0 ? d.exerciseMinutes : null)),
    },
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-4 w-full"
      role="img"
      aria-label="Line chart of sleep, water, and exercise habits over the last 30 days"
    >
      {/* Baseline */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={width - padding.right}
        y2={padding.top + chartH}
        stroke="#E7E5E4"
        strokeWidth={1}
      />

      {/* Day labels every 5 days */}
      {days.map((d, i) => {
        if (i % 5 !== 0) return null;
        const label = new Date(`${d.day}T12:00:00Z`).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        return (
          <text
            key={d.day}
            x={padding.left + i * slotW + slotW / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-surface-300"
            fontSize={10}
            fontFamily="var(--font-sans, Inter, sans-serif)"
          >
            {label}
          </text>
        );
      })}

      {/* Metric lines */}
      {series.map((s, si) => (
        <g key={s.id}>
          {lineSegments(s.points).map((path, pi) => (
            <motion.path
              key={`${s.id}-${pi}`}
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ delay: 0.2 + si * 0.15, duration: 0.8, ease: 'easeOut' }}
            />
          ))}
          {s.points.map((p, pi) =>
            p !== null ? (
              <motion.circle
                key={`${s.id}-dot-${pi}`}
                cx={p.x}
                cy={p.y}
                r={2}
                fill={s.color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + si * 0.15, ...gentleSpring }}
              />
            ) : null,
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * Compact recap card for one completed Mon–Sun week.
 */
function WeeklySummaryCard({
  week,
  avgWeeklyMinutes,
  index,
}: {
  week: WeeklySummary;
  avgWeeklyMinutes: number;
  index: number;
}) {
  const delta =
    avgWeeklyMinutes > 0
      ? Math.round(((week.studyMinutes - avgWeeklyMinutes) / avgWeeklyMinutes) * 100)
      : null;
  const positive = delta === null || delta >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      className="rounded-2xl border border-surface-200 bg-white p-5 shadow-soft"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, ...gentleSpring }}
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-surface-900">
          {formatWeekRange(week.weekStart)}
        </h3>
        {delta !== null && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              positive ? 'text-brand-500' : 'text-accent-600'
            }`}
          >
            <TrendIcon className="h-3 w-3" />
            {delta >= 0 ? '+' : ''}
            {delta}% vs your average
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2 text-surface-600">
          <Clock className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <span className="font-sans tabular-nums">{formatHours(week.studyMinutes)}</span>
        </div>
        <div className="flex items-center gap-2 text-surface-600">
          <Heart className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <span className="font-sans tabular-nums">{week.habitDays}/7 habit days</span>
        </div>
        <div className="flex items-center gap-2 text-surface-600">
          <Brain className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <span className="font-sans tabular-nums">
            {week.avgFocus !== null ? `${week.avgFocus}/5 focus` : 'No focus data'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-surface-600">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <span>{week.bestDay !== null ? `Best: ${week.bestDay}` : 'No study'}</span>
        </div>
      </div>
    </motion.div>
  );
}
