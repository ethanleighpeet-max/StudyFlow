'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Moon,
  Droplets,
  Dumbbell,
  Smile,
  Utensils,
  Flame,
  Minus,
  Plus,
  CalendarDays,
  Pencil,
  Check,
  NotebookPen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HABITS } from '@studyflow/shared';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

type HabitType = 'sleep' | 'water' | 'exercise' | 'mood' | 'meal';

interface HabitLog {
  id: string;
  type: HabitType;
  value: number;
  loggedAt: string;
}

interface Reflection {
  id: string;
  day: string;
  content: string;
  createdAt: string;
}

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'] as const;
const EXERCISE_PRESETS = [15, 30, 45, 60] as const;
const MEAL_RATINGS = [1, 2, 3, 4, 5] as const;

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
  meal: {
    border: 'border-surface-200',
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    bar: 'bg-accent-300',
    barMuted: 'bg-accent-50',
    value: 'text-accent-700',
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

  // Custom water target (preferences)
  const [waterTarget, setWaterTarget] = useState<number>(HABITS.WATER_DAILY_TARGET);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState<number>(HABITS.WATER_DAILY_TARGET);

  // Evening reflections
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionInput, setReflectionInput] = useState('');
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

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

    fetch('/api/preferences')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && typeof res.data?.waterTarget === 'number') {
          setWaterTarget(res.data.waterTarget);
          setTargetInput(res.data.waterTarget);
        }
      })
      .catch(() => {});

    fetch('/api/reflections')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setReflections(res.data);
        }
      })
      .catch(() => {});
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

  const saveWaterTarget = useCallback(async () => {
    const clamped = Math.min(20, Math.max(1, Math.round(targetInput) || HABITS.WATER_DAILY_TARGET));
    setEditingTarget(false);
    setTargetInput(clamped);
    const previous = waterTarget;
    setWaterTarget(clamped);
    const res = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waterTarget: clamped }),
    });
    const json = await res.json();
    if (!json.success) {
      setWaterTarget(previous);
      setError(json.error ?? 'Failed to save water target');
    }
  }, [targetInput, waterTarget]);

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

  // Days with at least one log per type — for the month calendars
  const loggedDaysFor = useCallback(
    (type: HabitType): Set<string> =>
      new Set(
        logs.filter((l) => l.type === type).map((l) => dayKey(new Date(l.loggedAt))),
      ),
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
  const mealToday = latestToday('meal');

  const habitsLoggedToday = new Set(todayLogs.map((l) => l.type)).size;

  // Evening reflection visibility + summary
  const todayReflection = reflections.find((r) => r.day === today);
  const showReflection = new Date().getHours() >= 19 || todayReflection !== undefined;

  useEffect(() => {
    if (todayReflection && reflectionInput === '' && !reflectionSaved) {
      setReflectionInput(todayReflection.content);
    }
    // Prefill once when today's reflection loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayReflection?.id]);

  const habitSummary = useMemo(() => {
    const parts: string[] = [];
    if (sleepToday) parts.push(`${sleepToday.value}h sleep`);
    if (waterToday > 0) parts.push(`${waterToday} glass${waterToday !== 1 ? 'es' : ''}`);
    if (exerciseToday > 0) parts.push(`${exerciseToday} min exercise`);
    if (mealToday) parts.push(`meals ${mealToday.value}/5`);
    if (moodToday) parts.push(MOOD_EMOJIS[moodToday.value - 1] ?? '🙂');
    return parts.join(' · ');
  }, [sleepToday, waterToday, exerciseToday, mealToday, moodToday]);

  const saveReflection = useCallback(async () => {
    const content = reflectionInput.trim();
    if (!content) return;
    setReflectionSaving(true);
    setReflectionSaved(false);
    try {
      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        setReflections((prev) => {
          const others = prev.filter((r) => r.id !== json.data.id);
          return [json.data, ...others];
        });
        setReflectionSaved(true);
      } else {
        setError(json.error ?? 'Failed to save reflection');
      }
    } finally {
      setReflectionSaving(false);
    }
  }, [reflectionInput]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-surface-100" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map((i) => (
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
            {habitsLoggedToday}/5 logged today
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
          loggedDays={loggedDaysFor('sleep')}
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
          historyMax={waterTarget}
          loggedDays={loggedDaysFor('water')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {editingTarget ? (
                <div className="flex items-center gap-2">
                  <span className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.water.value}`}>
                    {waterToday}
                  </span>
                  <span className="text-base font-medium text-surface-400">/</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={targetInput}
                    onChange={(e) => setTargetInput(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveWaterTarget();
                    }}
                    className="w-16 rounded-lg border border-brand-200 px-2 py-1 font-sans text-sm font-semibold tabular-nums text-brand-700 focus:border-brand-400 focus:outline-none"
                    aria-label="Daily water target"
                  />
                  <motion.button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={saveWaterTarget}
                    aria-label="Save water target"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              ) : (
                <p className={`font-sans text-3xl font-bold tabular-nums ${cardStyles.water.value}`}>
                  {waterToday}
                  <span className="text-base font-medium text-surface-400"> / {waterTarget} glasses</span>
                </p>
              )}
              {!editingTarget && (
                <motion.button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-300 hover:bg-surface-50 hover:text-surface-500"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={spring}
                  onClick={() => {
                    setTargetInput(waterTarget);
                    setEditingTarget(true);
                  }}
                  aria-label="Edit daily water target"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: waterTarget }, (_, i) => (
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
          loggedDays={loggedDaysFor('exercise')}
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
          loggedDays={loggedDaysFor('mood')}
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

        {/* Meals */}
        <HabitCard
          type="meal"
          icon={Utensils}
          title="Meals"
          streak={computeStreak(logs, 'meal')}
          history={week.map((d) => ({
            day: d,
            value: dailyTotal('meal', d),
            isToday: d === today,
          }))}
          historyMax={5}
          loggedDays={loggedDaysFor('meal')}
        >
          <div className="space-y-3">
            <p className="text-sm text-surface-500">
              {mealToday ? 'Eating quality today:' : 'How well did you eat today?'}
            </p>
            <div className="flex justify-between">
              {MEAL_RATINGS.map((value) => {
                const isSelected = mealToday?.value === value;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                      isSelected
                        ? 'bg-accent-100 ring-2 ring-accent-400'
                        : 'bg-surface-50 hover:bg-surface-100'
                    }`}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={() => logHabit('meal', value)}
                    aria-label={`Rate eating quality ${value} of 5`}
                  >
                    <Utensils
                      className={`h-4 w-4 ${isSelected ? 'text-accent-600' : 'text-surface-400'}`}
                    />
                    <span
                      className={`font-sans text-[11px] font-semibold tabular-nums ${
                        isSelected ? 'text-accent-700' : 'text-surface-400'
                      }`}
                    >
                      {value}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-surface-400">1 = junk food day · 5 = balanced & nourishing</p>
          </div>
        </HabitCard>
      </div>

      {/* Evening reflection */}
      {showReflection && (
        <motion.div
          className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-soft"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={gentleSpring}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-100">
              <NotebookPen className="h-[18px] w-[18px] text-secondary-600" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-surface-900">
                Evening reflection
              </h2>
              {habitSummary && (
                <p className="text-xs text-surface-400">Today: {habitSummary}</p>
              )}
            </div>
          </div>

          <textarea
            value={reflectionInput}
            onChange={(e) => {
              setReflectionInput(e.target.value);
              setReflectionSaved(false);
            }}
            maxLength={2000}
            rows={3}
            placeholder="How did today go? What helped you focus — and what got in the way?"
            className="mt-4 w-full resize-none rounded-xl border border-surface-200 bg-surface-50/40 px-3.5 py-2.5 text-sm text-surface-700 placeholder:text-surface-300 focus:border-secondary-300 focus:outline-none focus:ring-2 focus:ring-secondary-100"
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-surface-300">
              {reflectionSaved ? 'Saved' : `${reflectionInput.length}/2000`}
            </span>
            <motion.button
              type="button"
              className="rounded-xl bg-secondary-500 px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              disabled={reflectionSaving || reflectionInput.trim() === ''}
              onClick={saveReflection}
            >
              {reflectionSaving ? 'Saving…' : todayReflection ? 'Update' : 'Save'}
            </motion.button>
          </div>

          {/* Previous reflections */}
          {reflections.filter((r) => r.day !== today).length > 0 && (
            <div className="mt-5 space-y-2.5 border-t border-surface-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                Previous reflections
              </p>
              {reflections
                .filter((r) => r.day !== today)
                .map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-surface-100 bg-surface-50/40 px-4 py-3"
                  >
                    <p className="text-xs font-medium text-surface-400">
                      {new Date(`${r.day}T12:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-surface-600">{r.content}</p>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
      )}
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
  loggedDays,
  children,
}: {
  type: HabitType;
  icon: LucideIcon;
  title: string;
  streak: number;
  history: { day: string; value: number; isToday: boolean }[];
  historyMax: number;
  loggedDays: Set<string>;
  children: React.ReactNode;
}) {
  const s = cardStyles[type];
  const [showCalendar, setShowCalendar] = useState(false);

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
        <div className="flex items-center gap-1.5">
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
          <motion.button
            type="button"
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              showCalendar
                ? `${s.iconBg} ${s.iconColor}`
                : 'text-surface-300 hover:bg-surface-50 hover:text-surface-500'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => setShowCalendar((v) => !v)}
            aria-label={showCalendar ? `Hide ${title} calendar` : `Show ${title} calendar`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Month streak calendar */}
      <AnimatePresence initial={false}>
        {showCalendar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={gentleSpring}
            className="overflow-hidden"
          >
            <MonthCalendar type={type} loggedDays={loggedDays} />
          </motion.div>
        )}
      </AnimatePresence>

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

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function MonthCalendar({ type, loggedDays }: { type: HabitType; loggedDays: Set<string> }) {
  const s = cardStyles[type];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayStr = dayKey(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first column offset for the 1st of the month
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, (): string | null => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(year, month, i + 1))),
  ];

  return (
    <div className="mt-3 rounded-xl border border-surface-100 bg-surface-50/40 p-3">
      <p className="text-xs font-medium text-surface-400">
        {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="text-center text-[10px] font-medium text-surface-300"
          >
            {label}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`pad-${i}`} />
          ) : (
            <div key={day} className="flex h-5 items-center justify-center">
              <motion.div
                className={`h-2.5 w-2.5 rounded-full ${
                  loggedDays.has(day) ? s.bar : 'bg-surface-200/60'
                } ${day === todayStr ? 'ring-2 ring-surface-400 ring-offset-1' : ''}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring, delay: i * 0.008 }}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
