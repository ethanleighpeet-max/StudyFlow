'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, Trash2, Trophy, CalendarRange, X, Sparkles, Hourglass } from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

type GoalType = 'weekly_hours' | 'exam_prep' | 'habit_consistency';

interface Goal {
  id: string;
  type: GoalType;
  target: number;
  periodStart: string;
  periodEnd: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  progress: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Suggestions {
  overall: number;
  bySubject: { subjectId: string; subjectName: string; hours: number }[];
}

const BURST_DOTS = [0, 1, 2, 3, 4, 5];

const goalTypeMeta: Record<GoalType, { label: string; unit: string; description: string }> = {
  weekly_hours: {
    label: 'Weekly Study Hours',
    unit: 'h',
    description: 'Hours of study this week',
  },
  exam_prep: {
    label: 'Exam Prep',
    unit: 'h',
    description: 'Hours studied before the exam',
  },
  habit_consistency: {
    label: 'Habit Consistency',
    unit: ' days',
    description: 'Days with at least one habit logged',
  },
};

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfWeekISO(): string {
  const d = new Date(startOfWeekISO());
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<GoalType>('weekly_hours');
  const [formTarget, setFormTarget] = useState(6);
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Smart suggestions (last calendar week's studied hours), fetched once
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  useEffect(() => {
    if (!showForm || formType !== 'weekly_hours' || suggestions) return;
    fetch('/api/goals/suggestions')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSuggestions(json.data);
      })
      .catch(() => {});
  }, [showForm, formType, suggestions]);

  const lastWeekHours = useMemo(() => {
    if (!suggestions) return 0;
    if (formSubjectId) {
      return suggestions.bySubject.find((s) => s.subjectId === formSubjectId)?.hours ?? 0;
    }
    return suggestions.overall;
  }, [suggestions, formSubjectId]);

  const suggestedTarget = Math.max(1, Math.ceil(lastWeekHours + 0.5));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/goals').then((r) => r.json()),
      fetch('/api/subjects').then((r) => r.json()),
    ])
      .then(([goalsRes, subjectsRes]) => {
        if (goalsRes.success) setGoals(goalsRes.data);
        else setError(goalsRes.error ?? 'Failed to load goals');
        if (subjectsRes.success) setSubjects(subjectsRes.data);
      })
      .catch(() => setError('Failed to load goals'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createGoal = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const isWeekly = formType === 'weekly_hours';
    const isConsistency = formType === 'habit_consistency';

    const periodStart = isWeekly ? startOfWeekISO() : new Date().toISOString();
    let periodEnd: string;
    if (isWeekly) {
      periodEnd = endOfWeekISO();
    } else if (formEndDate) {
      periodEnd = new Date(`${formEndDate}T23:59:59`).toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (isConsistency ? formTarget : 14));
      periodEnd = d.toISOString();
    }

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: formType,
        target: formTarget,
        subjectId: formSubjectId || null,
        periodStart,
        periodEnd,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (json.success) {
      setShowForm(false);
      setFormTarget(6);
      setFormSubjectId('');
      setFormEndDate('');
      load();
    } else {
      setError(json.error ?? 'Failed to create goal');
    }
  }, [formType, formTarget, formSubjectId, formEndDate, load]);

  const deleteGoal = useCallback(async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }, []);

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-surface-900">Goals</h1>
          <p className="text-sm text-surface-500">
            {goals.length} active goal{goals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Goal'}
        </motion.button>
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

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="space-y-4 overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-soft"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={gentleSpring}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-surface-500">Goal type</span>
                <select
                  className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as GoalType)}
                >
                  <option value="weekly_hours">Weekly study hours</option>
                  <option value="exam_prep">Exam prep hours</option>
                  <option value="habit_consistency">Habit consistency (days)</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-surface-500">
                  Target ({goalTypeMeta[formType].unit.trim() || 'hours'})
                </span>
                <input
                  type="number"
                  min={1}
                  max={formType === 'habit_consistency' ? 60 : 100}
                  className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  value={formTarget}
                  onChange={(e) => setFormTarget(Number(e.target.value))}
                />
              </label>

              {formType !== 'habit_consistency' && (
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-surface-500">Subject (optional)</span>
                  <select
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                  >
                    <option value="">All subjects</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formType === 'exam_prep' && (
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-surface-500">Exam date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </label>
              )}
            </div>

            {/* Smart suggestion chip */}
            <AnimatePresence>
              {formType === 'weekly_hours' && lastWeekHours > 0 && (
                <motion.button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  onClick={() => setFormTarget(suggestedTarget)}
                >
                  <Sparkles className="h-3 w-3" />
                  Last week:{' '}
                  <span className="font-sans font-semibold tabular-nums">{lastWeekHours}h</span>
                  {' — '}aim for{' '}
                  <span className="font-sans font-semibold tabular-nums">{suggestedTarget}h</span>?
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={spring}
              disabled={submitting || formTarget < 1}
              onClick={createGoal}
            >
              {submitting ? 'Creating…' : 'Create Goal'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
      ) : goals.length === 0 && !showForm ? (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white py-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Target className="h-7 w-7 text-brand-400" />
          </motion.div>
          <p className="text-sm text-surface-500">No goals yet. Set one to stay on track.</p>
          <motion.button
            type="button"
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
            onClick={() => setShowForm(true)}
          >
            Create Your First Goal
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {goals.map((goal, i) => {
              const meta = goalTypeMeta[goal.type];
              const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
              const achieved = goal.progress >= goal.target;
              const daysLeft = Math.max(
                1,
                Math.ceil((new Date(goal.periodEnd).getTime() - Date.now()) / 86400000),
              );
              const perDay =
                Math.round(Math.max(0, (goal.target - goal.progress) / daysLeft) * 10) / 10;

              return (
                <motion.div
                  key={goal.id}
                  className={
                    achieved
                      ? 'rounded-2xl bg-gradient-to-br from-accent-300 via-accent-400 to-accent-200 p-[1.5px] shadow-glow'
                      : 'rounded-2xl border border-surface-200 bg-white p-5'
                  }
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.05, ...gentleSpring }}
                >
                  <div className={achieved ? 'rounded-[14px] bg-white p-5' : undefined}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {achieved && (
                        <motion.div
                          className="relative"
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={spring}
                        >
                          <Trophy className="h-4 w-4 text-accent-500" />
                          {/* One-time celebration burst */}
                          {BURST_DOTS.map((j) => {
                            const angle = (j / BURST_DOTS.length) * Math.PI * 2;
                            return (
                              <motion.span
                                key={j}
                                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent-400"
                                initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
                                animate={{
                                  x: `calc(-50% + ${Math.round(Math.cos(angle) * 18)}px)`,
                                  y: `calc(-50% + ${Math.round(Math.sin(angle) * 18)}px)`,
                                  scale: 0,
                                  opacity: 0,
                                }}
                                transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
                              />
                            );
                          })}
                        </motion.div>
                      )}
                      <span className="font-medium text-surface-900">{meta.label}</span>
                      {goal.subjectName && (
                        <span
                          className="flex items-center gap-1.5 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500"
                        >
                          {goal.subjectColor && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: goal.subjectColor }}
                            />
                          )}
                          {goal.subjectName}
                        </span>
                      )}
                    </div>
                    <motion.button
                      type="button"
                      className="text-surface-300 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteGoal(goal.id)}
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="font-sans text-xl font-bold tabular-nums text-surface-900">
                      {goal.progress}
                      {meta.unit}
                      <span className="text-sm font-medium text-surface-400">
                        {' '}
                        / {goal.target}
                        {meta.unit}
                      </span>
                    </p>
                    <span className="flex items-center gap-1 text-xs text-surface-400">
                      <CalendarRange className="h-3 w-3" />
                      until{' '}
                      {new Date(goal.periodEnd).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-100">
                    <motion.div
                      className={`h-full rounded-full ${
                        achieved
                          ? 'bg-gradient-to-r from-accent-400 to-accent-500'
                          : 'bg-gradient-to-r from-brand-400 to-brand-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + i * 0.05, ...gentleSpring }}
                    />
                  </div>

                  {/* Exam countdown */}
                  {goal.type === 'exam_prep' && (
                    <div className="mt-2 flex items-center gap-2.5 text-xs">
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          daysLeft <= 3 ? 'text-red-500' : 'text-surface-500'
                        }`}
                      >
                        <Hourglass className="h-3 w-3" />
                        <span className="font-sans tabular-nums">{daysLeft}</span>
                        {' '}day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                      <span className="text-surface-400">
                        suggested ≈{' '}
                        <span className="font-sans font-semibold tabular-nums">{perDay}</span>
                        {' '}h/day
                      </span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-surface-400">{meta.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
