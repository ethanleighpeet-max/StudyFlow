'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Clock,
  Brain,
  Droplets,
  Flame,
  Play,
  Plus,
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
}

// Spring physics from design tokens
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

// Stagger children animation
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: gentleSpring },
};

export function DashboardContent({
  firstName,
  initialStats,
}: {
  firstName: string;
  initialStats?: DashboardStats;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = initialStats ?? {
    todayMinutes: 0,
    todaySessions: 0,
    avgFocusRating: 0,
    streak: 0,
    weeklyMinutes: 0,
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
        {/* Decorative circles */}
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

        {/* Quick actions */}
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
          index={0}
        />
        <StatCard
          icon={Brain}
          title="Focus Score"
          value={focusValue}
          subtitle={focusSubtitle}
          color="secondary"
          index={1}
        />
        <StatCard
          icon={Droplets}
          title="Habits Logged"
          value="0 / 5"
          subtitle="Log your first habit"
          color="accent"
          index={2}
        />
        <StatCard
          icon={Flame}
          title="Active Streak"
          value={streakValue}
          subtitle={streakSubtitle}
          color="brand"
          index={3}
        />
      </motion.div>

      {/* Content sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <ContentCard
            icon={BookOpen}
            title="Recent Study Sessions"
            emptyMessage="Start your first study session to see your progress here"
            emptyAction="Start Studying"
            href="/dashboard/study"
            color="brand"
          />
        </motion.div>

        <motion.div variants={item}>
          <ContentCard
            icon={Heart}
            title="Today's Habits"
            emptyMessage="Track your sleep, water, exercise, and mood to unlock insights"
            emptyAction="Log a Habit"
            href="/dashboard/habits"
            color="secondary"
          />
        </motion.div>
      </div>

      {/* Insights teaser */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl border border-surface-200 bg-gradient-to-r from-secondary-50/50 to-accent-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100">
              <TrendingUp className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-surface-900">
                Insights will appear here
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Once you log a few study sessions and habits, StudyFlow will show you how your
                daily routines affect your focus and productivity.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
  index,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  color: 'brand' | 'secondary' | 'accent';
  index: number;
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

function ContentCard({
  icon: Icon,
  title,
  emptyMessage,
  emptyAction,
  href,
  color,
}: {
  icon: LucideIcon;
  title: string;
  emptyMessage: string;
  emptyAction: string;
  href: string;
  color: 'brand' | 'secondary';
}) {
  const contentStyles = {
    brand: {
      headerIconBg: 'bg-brand-100',
      headerIconColor: 'text-brand-600',
      emptyIconBg: 'bg-brand-50',
      emptyIconColor: 'text-brand-400',
      buttonBg: 'bg-brand-500',
    },
    secondary: {
      headerIconBg: 'bg-secondary-100',
      headerIconColor: 'text-secondary-600',
      emptyIconBg: 'bg-secondary-50',
      emptyIconColor: 'text-secondary-400',
      buttonBg: 'bg-secondary-500',
    },
  };

  const cs = contentStyles[color];

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cs.headerIconBg}`}>
          <Icon className={`h-4 w-4 ${cs.headerIconColor}`} />
        </div>
        <h2 className="font-heading text-base font-semibold text-surface-900">{title}</h2>
      </div>

      {/* Empty state */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-surface-50/50 py-10">
        <motion.div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cs.emptyIconBg} mb-4`}
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon className={`h-7 w-7 ${cs.emptyIconColor}`} />
        </motion.div>
        <p className="max-w-[240px] text-center text-sm text-surface-400">
          {emptyMessage}
        </p>
        <Link href={href}>
          <motion.div
            className={`mt-4 rounded-lg ${cs.buttonBg} px-4 py-2 text-sm font-semibold text-white shadow-sm`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
          >
            {emptyAction}
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
