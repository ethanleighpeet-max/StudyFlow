'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Droplets, Dumbbell, Smile, Flame, Minus, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

type HabitType = 'sleep' | 'water' | 'exercise' | 'mood';

interface HabitLog {
  id: string;
  type: HabitType | 'meal';
  value: number;
  loggedAt: string;
}

const WATER_TARGET = 8;
const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'] as const;
const EXERCISE_PRESETS = [15, 30, 45, 60] as const;

// Static color maps — Tailwind purges dynamic classes
const cardStyles: Record<HabitType, { border: string; iconBg: string; iconColor: string; bar: string; barMuted: string; value: string }> = {
  sleep: {
    border: 'border-secondary-100',
    iconBg: 'bg-secondary-100',
    iconColor: 'text-secondary-600',
    bar: 'bg-secondary-400',
    barMuted: 'bg-secondary-100',
    value: 'text-secondary-700',
  },
  water: {
    border: 'border-brand-100',
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-600',
    bar: 'bg-brand-400',
    barMuted: 'bg-brand-100',
    value: 'text-brand-700',
  },
  exercise: {
    border: 'border-accent-100',
    iconBg: 'bg-accent-100',
    iconColor: 'text-accent-600',
    bar: 'bg-accent-400',
    barMuted: 'bg-accent-100',
    value: 'text-accent-700',
  },
  mood: {
    border: 'border-surface-200',
    iconBg: 'bg-surface-100',
    iconColor: 'text-surface-600',
    bar: 'bg-surface-400',
    barMuted: 'bg-surface-100',
    value: 'text-surface-700',
  },
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

/** Consecutive days (ending today or yesterday) with at least one log of this type. */
function computeStreak(logs: HabitLog[], type: HabitType): number {
  const daysWithLog = new Set(
    logs.filter((l) => l.type === type).map((l) => dayKey(new Date(l.loggedAt))),
  );

  let streak = 0;
  const cursor = new Date();

  // Today not logged yet doesn't break the streak — start from yesterday
  if (!daysWithLog.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daysWithLog.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function HabitsView() {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sleepInput, setSleepInput] = useState(7.5);

  useEffect(() => {
    fetch('/api/habits?days=30')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setLogs(res.data);
        } else {
          setError(res.error ?? 'Failed to load habits');
        }
      })
      .catch(() => setError('Failed to load habits'))
      .finally(() => setLoading(false));
  }, []);

  const logHabit = useCallback(async (type: HabitType, value: number) => {
    setError(null);
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value }),
    });
    const json = await res.json();
    if (json.success) {
      setLogs((prev) => [json.data, ...prev]);
    } else {
      setError(json.error ?? 'Failed to log habit');
    }
  }, []);

  const undoLast = useCallback(
    async (type: HabitType) => {
      const today = dayKey(new Date());
      const last = logs.find(
        (l) => l.type === type && dayKey(new Date(l.loggedAt)) === today,
      );
      if (!last) return;

      const res = await fetch(`/api/habits/${last.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setLogs((prev) => prev.filter((l) => l.id !== last.id));
      }
    },
    [logs],
  );

  const today = dayKey(new Date());
  const week = useMemo(() => lastNDays(7), []);

  const todayLogs = useMemo(
    () => logs.filter((l) => dayKey(new Date(l.loggedAt)) === today),
    [logs, today],
  );

  // Per-day totals for mini history bars
  const dailyTotal = useCallback(
    (type: HabitType, day: string): number =>
      logs
        .filter((l) => l.type === type && dayKey(new Date(l.loggedAt)) === day)
        .reduce((sum, l) => sum + l.value, 0),
    [logs],
  );

  const latestToday = useCallback(
    (type: HabitType): HabitLog | undefined =>
      todayLogs.find((l) => l.type === type),
    [todayLogs],
  );

  const sleepToday = latestToday('sleep');
  const waterToday = todayLogs
    .filter((l) => l.type === 'water')
    .reduce((sum, l) => sum + l.value, 0);
  const exerciseToday = todayLogs
    .filter((l) => l.type === 'exercise')
    .reduce((sum, l) => sum + l.value, 0);
  const moodToday = latestToday('mood');

  const habitsLoggedToday = new Set(todayLogs.map((l) => l.type)).size;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-surface-100" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-surface-900">Habits</h1>
          <p className="text-sm text-surface-500">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
            {' · '}
            {habitsLoggedToday}/4 logged today
          </p>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Sleep */}
        <HabitCard
          type="sleep"
          icon={Moon}
          title="Sleep"
          streak={computeStreak(logs, 'sleep')}
          history={week.map((d) => ({
            day: d,
            value: dailyTotal('sleep', d),
            isToday: d === today,
          }))}
          historyMax={10}
        >
          {sleepToday ? (
            <p className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.sleep.value}`}>
              {sleepToday.value}h
              <span className="ml-2 text-sm font-medium text-surface-400">logged</span>
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.sleep.value}`}>
                  {sleepInput}h
                </span>
                <span className="text-xs text-surface-400">How long did you sleep?</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={sleepInput}
                onChange={(e) => setSleepInput(Number(e.target.value))}
                className="w-full accent-[#7C6FAE]"
              />
              <motion.button
                type="button"
                className="w-full rounded-xl bg-secondary-500 py-2.5 text-sm font-semibold text-white shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => logHabit('sleep', sleepInput)}
              >
                Log Sleep
              </motion.button>
            </div>
          )}
        </HabitCard>

        {/* Water */}
        <HabitCard
          type="water"
          icon={Droplets}
          title="Water"
          streak={computeStreak(logs, 'water')}
          history={week.map((d) => ({
            day: d,
            value: dailyTotal('water', d),
            isToday: d === today,
          }))}
          historyMax={WATER_TARGET}
        >
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.water.value}`}>
                {waterToday}
                <span className="text-base font-medium text-surface-400"> / {WATER_TARGET} glasses</span>
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: WATER_TARGET }, (_, i) => (
                <motion.div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < waterToday ? cardStyles.water.bar : cardStyles.water.barMuted
                  }`}
                  initial={false}
                  animate={{ scale: i < waterToday ? 1 : 0.9, opacity: i < waterToday ? 1 : 0.6 }}
                  transition={spring}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <motion.button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => logHabit('water', 1)}
              >
                <Plus className="h-4 w-4" /> Glass
              </motion.button>
              {waterToday > 0 && (
                <motion.button
                  type="button"
                  className="flex items-center justify-center rounded-xl border border-surface-200 px-3 text-surface-400 hover:bg-surface-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => undoLast('water')}
                  aria-label="Undo last glass"
                >
                  <Minus className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </div>
        </HabitCard>

        {/* Exercise */}
        <HabitCard
          type="exercise"
          icon={Dumbbell}
          title="Exercise"
          streak={computeStreak(logs, 'exercise')}
          history={week.map((d) => ({
            day: d,
            value: dailyTotal('exercise', d),
            isToday: d === today,
          }))}
          historyMax={60}
        >
          <div className="space-y-3">
            <p className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.exercise.value}`}>
              {exerciseToday}
              <span className="text-base font-medium text-surface-400"> min today</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {EXERCISE_PRESETS.map((mins) => (
                <motion.button
                  key={mins}
                  type="button"
                  className="rounded-xl border border-accent-200 bg-accent-50 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-100"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => logHabit('exercise', mins)}
                >
                  +{mins}
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-surface-400">Tap to add minutes of activity</p>
          </div>
        </HabitCard>

        {/* Mood */}
        <HabitCard
          type="mood"
          icon={Smile}
          title="Mood"
          streak={computeStreak(logs, 'mood')}
          history={week.map((d) => ({
            day: d,
            value: dailyTotal('mood', d),
            isToday: d === today,
          }))}
          historyMax={5}
        >
          <div className="space-y-3">
            <p className="text-sm text-surface-500">
              {moodToday ? 'Feeling today:' : 'How are you feeling?'}
            </p>
            <div className="flex justify-between">
              {MOOD_EMOJIS.map((emoji, i) => {
                const value = i + 1;
                const isSelected = moodToday?.value === value;
                return (
                  <motion.button
                    key={emoji}
                    type="button"
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-colors ${
                      isSelected
                        ? 'bg-accent-100 ring-2 ring-accent-400'
                        : 'bg-surface-50 hover:bg-surface-100'
                    }`}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={() => logHabit('mood', value)}
                  >
                    {emoji}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </HabitCard>
      </div>
    </motion.div>
  );
}

function HabitCard({
  type,
  icon: Icon,
  title,
  streak,
  history,
  historyMax,
  children,
}: {
  type: HabitType;
  icon: LucideIcon;
  title: string;
  streak: number;
  history: { day: string; value: number; isToday: boolean }[];
  historyMax: number;
  children: React.ReactNode;
}) {
  const s = cardStyles[type];

  return (
    <motion.div
      className={`rounded-2xl border ${s.border} bg-white p-5 shadow-soft`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}>
            <Icon className={`h-[18px] w-[18px] ${s.iconColor}`} />
          </div>
          <h2 className="font-heading text-base font-semibold text-surface-900">{title}</h2>
        </div>
        {streak > 0 && (
          <motion.div
            className="flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-600"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={spring}
          >
            <Flame className="h-3 w-3" />
            {streak}
          </motion.div>
        )}
      </div>

      <div className="mt-4">{children}</div>

      {/* 7-day mini history */}
      <div className="mt-4 flex h-10 items-end gap-1.5">
        {history.map((h) => (
          <div key={h.day} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              className={`w-full rounded-sm ${h.value > 0 ? s.bar : s.barMuted}`}
              initial={{ height: 2 }}
              animate={{
                height: Math.max(2, Math.min(1, h.value / historyMax) * 32),
              }}
              transition={gentleSpring}
            />
            <span
              className={`text-[10px] ${h.isToday ? 'font-semibold text-surface-600' : 'text-surface-300'}`}
            >
              {new Date(`${h.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
