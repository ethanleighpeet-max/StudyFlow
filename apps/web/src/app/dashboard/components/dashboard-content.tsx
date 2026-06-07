'use client';

// Dashboard overview: live stats, recent sessions, today's habits with one-tap logging
import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Brain,
  Droplets,
  Dumbbell,
  Flame,
  Moon,
  Play,
  Plus,
  Smile,
  Sparkles,
  Star,
  TrendingUp,
  BookOpen,
  Heart,
  Sun,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DashboardStats {
  todayMinutes: number;
  todaySessions: number;
  avgFocusRating: number;
  streak: number;
  weeklyMinutes: number;
  habitsToday: number;
}

interface RecentSession {
  id: string;
  subjectName: string | null;
  subjectColor: string | null;
  startedAt: string;
  endedAt: string | null;
  focusRating: number | null;
}

interface TodayHabits {
  sleepHours: number | null;
  waterGlasses: number;
  exerciseMinutes: number;
  mood: number | null;
}

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'] as const;

// Spring physics from design tokens
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: gentleSpring },
};

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In progress';
  const diff = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function relativeDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function DashboardContent({
  firstName,
  initialStats,
  recentSessions = [],
  todayHabits = { sleepHours: null, waterGlasses: 0, exerciseMinutes: 0, mood: null },
}: {
  firstName: string;
  initialStats?: DashboardStats;
  recentSessions?: RecentSession[];
  todayHabits?: TodayHabits;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = initialStats ?? {
    todayMinutes: 0,
    todaySessions: 0,
    avgFocusRating: 0,
    streak: 0,
    weeklyMinutes: 0,
    habitsToday: 0,
  };

  const studyHours = Math.floor(stats.todayMinutes / 60);
  const studyMins = stats.todayMinutes % 60;
  const studyTimeValue = `${studyHours}h ${studyMins}m`;
  const studySubtitle =
    stats.todaySessions > 0
      ? `${stats.todaySessions} session${stats.todaySessions !== 1 ? 's' : ''} today`
      : 'No sessions yet';

  const focusValue = stats.avgFocusRating > 0 ? `${stats.avgFocusRating}/5` : '--';
  const focusSubtitle =
    stats.avgFocusRating > 0 ? 'Avg this week' : 'Start a session to track';

  const streakValue = `${stats.streak} day${stats.streak !== 1 ? 's' : ''}`;
  const streakSubtitle =
    stats.streak > 0 ? 'Keep it going!' : 'Start your streak today';

  return (
    <motion.div
      className="space-y-8 p-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header with gradient background */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-secondary-600 p-8 text-white shadow-lg"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute left-1/2 top-0 h-32 w-32 rounded-full bg-accent-400/10" />

        <div className="relative z-10">
          <motion.div
            className="flex items-center gap-2 text-brand-100"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, ...gentleSpring }}
          >
            <Sun className="h-4 w-4" />
            <span className="text-sm font-medium">{greeting}</span>
          </motion.div>
          <h1 className="mt-1 font-heading text-3xl font-bold">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-brand-100/80">
            Here&apos;s how your study and wellbeing are looking today.
          </p>
        </div>

        <div className="relative z-10 mt-6 flex gap-3">
          <QuickAction icon={Play} label="Start Study Session" href="/dashboard/study" primary />
          <QuickAction icon={Plus} label="Log Habit" href="/dashboard/habits" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={Clock}
          title="Study Time Today"
          value={studyTimeValue}
          subtitle={studySubtitle}
          color="brand"
        />
        <StatCard
          icon={Brain}
          title="Focus Score"
          value={focusValue}
          subtitle={focusSubtitle}
          color="secondary"
        />
        <StatCard
          icon={Droplets}
          title="Habits Logged"
          value={`${stats.habitsToday} / 4`}
          subtitle={stats.habitsToday > 0 ? 'Logged today' : 'Log your first habit'}
          color="accent"
        />
        <StatCard
          icon={Flame}
          title="Active Streak"
          value={streakValue}
          subtitle={streakSubtitle}
          color="brand"
        />
      </motion.div>

      {/* Content sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <RecentSessionsCard sessions={recentSessions} />
        </motion.div>

        <motion.div variants={item}>
          <TodayHabitsCard habits={todayHabits} />
        </motion.div>
      </div>

      {/* Insights teaser */}
      <motion.div variants={item}>
        <Link href="/dashboard/insights" className="block">
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-surface-200 bg-gradient-to-r from-secondary-50/50 to-accent-50/50 p-6"
            whileHover={{ y: -2 }}
            transition={spring}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100">
                <TrendingUp className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-surface-900">
                  See your insights
                </h3>
                <p className="mt-1 text-sm text-surface-500">
                  StudyFlow connects your study sessions and habits to show how your daily
                  routines affect your focus and productivity.
                </p>
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

function RecentSessionsCard({ sessions }: { sessions: RecentSession[] }) {
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  const seedDemo = async (): Promise<void> => {
    setSeeding(true);
    try {
      await fetch('/api/dev/seed?confirm=yes');
      router.refresh();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
            <BookOpen className="h-4 w-4 text-brand-600" />
          </div>
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Recent Study Sessions
          </h2>
        </div>
        {sessions.length > 0 && (
          <Link
            href="/dashboard/study/history"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-surface-50/50 py-10">
          <motion.div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BookOpen className="h-7 w-7 text-brand-400" />
          </motion.div>
          <p className="max-w-[240px] text-center text-sm text-surface-400">
            Start your first study session to see your progress here
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard/study">
              <motion.div
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={spring}
              >
                Start Studying
              </motion.div>
            </Link>
            <motion.button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-500 hover:bg-surface-50 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              disabled={seeding}
              onClick={seedDemo}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {seeding ? 'Loading…' : 'Load demo data'}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-surface-100 bg-surface-50/40 px-4 py-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, ...gentleSpring }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: session.subjectColor ?? '#A8A29E' }}
                />
                <div>
                  <p className="text-sm font-medium text-surface-900">
                    {session.subjectName ?? 'No subject'}
                  </p>
                  <p className="text-xs text-surface-400">
                    {relativeDay(session.startedAt)} ·{' '}
                    {formatDuration(session.startedAt, session.endedAt)}
                  </p>
                </div>
              </div>
              {session.focusRating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        s <= (session.focusRating ?? 0)
                          ? 'fill-accent-400 text-accent-400'
                          : 'text-surface-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayHabitsCard({ habits }: { habits: TodayHabits }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const log = async (type: 'water' | 'exercise' | 'mood', value: number): Promise<void> => {
    setPending(type);
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100">
            <Heart className="h-4 w-4 text-secondary-600" />
          </div>
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Today&apos;s Habits
          </h2>
        </div>
        <Link
          href="/dashboard/habits"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Open habits
        </Link>
      </div>

      <div className="mt-4 space-y-2.5">
        {/* Sleep */}
        <HabitRow icon={Moon} iconBg="bg-secondary-100" iconColor="text-secondary-600" label="Sleep">
          {habits.sleepHours !== null ? (
            <span className="font-sans text-sm font-bold tabular-nums text-surface-900">
              {habits.sleepHours}h
            </span>
          ) : (
            <Link
              href="/dashboard/habits"
              className="text-xs font-semibold text-secondary-600 hover:text-secondary-700"
            >
              Log sleep →
            </Link>
          )}
        </HabitRow>

        {/* Water */}
        <HabitRow icon={Droplets} iconBg="bg-brand-100" iconColor="text-brand-600" label="Water">
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-sm font-bold tabular-nums text-surface-900">
              {habits.waterGlasses} / 8
            </span>
            <motion.button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-white disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              disabled={pending === 'water'}
              onClick={() => log('water', 1)}
              aria-label="Add a glass of water"
            >
              <Plus className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </HabitRow>

        {/* Exercise */}
        <HabitRow icon={Dumbbell} iconBg="bg-accent-100" iconColor="text-accent-600" label="Exercise">
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-sm font-bold tabular-nums text-surface-900">
              {habits.exerciseMinutes} min
            </span>
            <motion.button
              type="button"
              className="rounded-md bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={spring}
              disabled={pending === 'exercise'}
              onClick={() => log('exercise', 30)}
            >
              +30
            </motion.button>
          </div>
        </HabitRow>

        {/* Mood */}
        <HabitRow icon={Smile} iconBg="bg-surface-100" iconColor="text-surface-600" label="Mood">
          {habits.mood !== null ? (
            <span className="text-lg">{MOOD_EMOJIS[habits.mood - 1] ?? '🙂'}</span>
          ) : (
            <div className="flex gap-1">
              {MOOD_EMOJIS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  type="button"
                  className="rounded-lg p-0.5 text-base hover:bg-surface-100 disabled:opacity-50"
                  whileHover={{ scale: 1.25, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={spring}
                  disabled={pending === 'mood'}
                  onClick={() => log('mood', i + 1)}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          )}
        </HabitRow>
      </div>
    </div>
  );
}

function HabitRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  children,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-100 bg-surface-50/40 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium text-surface-700">{label}</span>
      </div>
      {children}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  primary = false,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          primary
            ? 'bg-white text-brand-700 shadow-md hover:bg-brand-50'
            : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'
        }`}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={spring}
      >
        <Icon className="h-4 w-4" />
        {label}
      </motion.div>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  color: 'brand' | 'secondary' | 'accent';
}) {
  const styles = {
    brand: {
      bg: 'bg-gradient-to-br from-brand-50 to-brand-100/50',
      border: 'border-brand-100',
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-600',
      value: 'text-brand-700',
    },
    secondary: {
      bg: 'bg-gradient-to-br from-secondary-50 to-secondary-100/50',
      border: 'border-secondary-100',
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
      value: 'text-secondary-700',
    },
    accent: {
      bg: 'bg-gradient-to-br from-accent-50 to-accent-100/50',
      border: 'border-accent-100',
      iconBg: 'bg-accent-100',
      iconColor: 'text-accent-600',
      value: 'text-accent-700',
    },
  };

  const s = styles[color];

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-5`}
      whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(15, 139, 141, 0.1)' }}
      transition={spring}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
          <Icon className={`h-5 w-5 ${s.iconColor}`} />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-surface-500">{title}</p>
      <p className={`mt-1 font-sans text-2xl font-bold tabular-nums ${s.value}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-surface-400">{subtitle}</p>
    </motion.div>
  );
}
