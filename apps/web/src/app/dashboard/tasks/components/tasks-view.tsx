'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ClipboardCheck,
  Plus,
  Trash2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: Priority;
  completedAt: string | null;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

// Static maps — Tailwind purges dynamic classes
const priorityStyles: Record<Priority, { dot: string; label: string }> = {
  low: { dot: 'bg-surface-300', label: 'Low' },
  medium: { dot: 'bg-brand-400', label: 'Medium' },
  high: { dot: 'bg-accent-500', label: 'High' },
};

type TaskGroup = 'overdue' | 'today' | 'upcoming' | 'someday' | 'done';

const groupLabels: Record<TaskGroup, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  someday: 'No due date',
  done: 'Completed',
};

function groupTask(task: Task): TaskGroup {
  if (task.completedAt) return 'done';
  if (!task.dueDate) return 'someday';

  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due < today) return 'overdue';
  if (due < tomorrow) return 'today';
  return 'upcoming';
}

type TasksViewMode = 'list' | 'week';

/** Monday 00:00 of the current week. */
function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TasksViewMode>('list');

  // Quick-add form
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/subjects').then((r) => r.json()),
    ])
      .then(([tasksRes, subjectsRes]) => {
        if (tasksRes.success) setTasks(tasksRes.data);
        else setError(tasksRes.error ?? 'Failed to load tasks');
        if (subjectsRes.success) setSubjects(subjectsRes.data);
      })
      .catch(() => setError('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, []);

  const addTask = useCallback(async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        subjectId: subjectId || null,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
        priority,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (json.success) {
      const subject = subjects.find((s) => s.id === json.data.subjectId);
      setTasks((prev) => [
        {
          ...json.data,
          subjectName: subject?.name ?? null,
          subjectColor: subject?.color ?? null,
        },
        ...prev,
      ]);
      setTitle('');
      setDueDate('');
    } else {
      setError(json.error ?? 'Failed to add task');
    }
  }, [title, subjectId, dueDate, priority, subjects]);

  const toggleTask = useCallback(async (task: Task) => {
    const completed = !task.completedAt;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: completed ? new Date().toISOString() : null }
          : t,
      ),
    );

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    const json = await res.json();
    if (!json.success) {
      // Roll back
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completedAt: task.completedAt } : t)),
      );
    }
  }, []);

  const moveTaskDay = useCallback(async (task: Task, delta: number) => {
    if (!task.dueDate) return;
    const next = new Date(task.dueDate);
    next.setDate(next.getDate() + delta);
    const iso = next.toISOString();

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, dueDate: iso } : t)));

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: iso }),
    });
    const json = await res.json();
    if (!json.success) {
      // Roll back
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, dueDate: task.dueDate } : t)),
      );
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<TaskGroup, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      someday: [],
      done: [],
    };
    for (const task of tasks) {
      groups[groupTask(task)].push(task);
    }
    return groups;
  }, [tasks]);

  const openCount = tasks.filter((t) => !t.completedAt).length;

  const weekDays = useMemo(() => {
    const start = startOfWeek();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  // Open tasks bucketed into this week's days + a "no date" row (completed hidden)
  const week = useMemo(() => {
    const start = weekDays[0];
    const byDay: Task[][] = Array.from({ length: 7 }, () => []);
    const noDate: Task[] = [];

    for (const task of tasks) {
      if (task.completedAt) continue;
      if (!task.dueDate) {
        noDate.push(task);
        continue;
      }
      if (!start) continue;
      const dayIndex = Math.floor(
        (new Date(task.dueDate).setHours(0, 0, 0, 0) - start.getTime()) / 86400000,
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        byDay[dayIndex]?.push(task);
      }
    }
    return { byDay, noDate };
  }, [tasks, weekDays]);

  const todayKey = new Date().toDateString();

  const renderWeekCard = (task: Task, withArrows: boolean) => {
    const p = priorityStyles[task.priority];

    return (
      <motion.div
        key={task.id}
        layout
        className="group/card rounded-lg border border-surface-200 bg-white p-2 transition-colors hover:border-surface-300"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={gentleSpring}
      >
        <div className="flex items-start gap-1.5">
          {/* Checkbox (completed tasks are hidden in week view) */}
          <motion.button
            type="button"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-2 border-surface-300 bg-white hover:border-brand-400"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            transition={spring}
            onClick={() => toggleTask(task)}
            aria-label="Mark complete"
          />
          <p className="min-w-0 flex-1 break-words text-xs leading-snug text-surface-900">
            {task.title}
          </p>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {task.subjectColor && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: task.subjectColor }}
                title={task.subjectName ?? undefined}
              />
            )}
            <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} title={p.label} />
          </span>
          {withArrows && (
            <span className="flex gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
              <motion.button
                type="button"
                className="rounded p-0.5 text-surface-300 hover:bg-surface-100 hover:text-surface-600"
                whileTap={{ scale: 0.85 }}
                transition={spring}
                onClick={() => moveTaskDay(task, -1)}
                aria-label="Move to previous day"
              >
                <ChevronLeft className="h-3 w-3" />
              </motion.button>
              <motion.button
                type="button"
                className="rounded p-0.5 text-surface-300 hover:bg-surface-100 hover:text-surface-600"
                whileTap={{ scale: 0.85 }}
                transition={spring}
                onClick={() => moveTaskDay(task, 1)}
                aria-label="Move to next day"
              >
                <ChevronRight className="h-3 w-3" />
              </motion.button>
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`mx-auto space-y-6 p-8 ${view === 'week' ? 'max-w-6xl' : 'max-w-3xl'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-surface-900">Tasks</h1>
          <p className="text-sm text-surface-500">
            {openCount} open task{openCount !== 1 ? 's' : ''}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex overflow-hidden rounded-xl border border-surface-200 bg-white shadow-soft">
          {(['list', 'week'] as const).map((v) => (
            <motion.button
              key={v}
              type="button"
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${
                view === v
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-white text-surface-400 hover:text-surface-600'
              }`}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setView(v)}
            >
              {v === 'list' ? (
                <List className="h-3.5 w-3.5" />
              ) : (
                <CalendarDays className="h-3.5 w-3.5" />
              )}
              {v}
            </motion.button>
          ))}
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

      {/* Quick add */}
      <div className="space-y-3 rounded-2xl border border-surface-200 bg-white p-4 shadow-soft">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a task… e.g. Finish statistics problem set"
            className="flex-1 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
            }}
          />
          <motion.button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
            disabled={submitting || !title.trim()}
            onClick={addTask}
          >
            <Plus className="h-4 w-4" />
            Add
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-600 outline-none focus:border-brand-300"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-600 outline-none focus:border-brand-300"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="flex overflow-hidden rounded-lg border border-surface-200">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2.5 py-1.5 text-xs capitalize transition-colors ${
                  priority === p
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'bg-white text-surface-400 hover:text-surface-600'
                }`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task groups */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
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
            <ClipboardCheck className="h-7 w-7 text-brand-400" />
          </motion.div>
          <p className="text-sm text-surface-500">No tasks yet. Add your first one above.</p>
        </motion.div>
      ) : view === 'week' ? (
        <div className="space-y-4">
          {/* Week grid: Mon–Sun */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, di) => {
              const isToday = day.toDateString() === todayKey;
              const dayTasks = week.byDay[di] ?? [];

              return (
                <div key={day.toISOString()} className="space-y-1.5">
                  <div
                    className={`rounded-lg px-1 py-1.5 text-center ${
                      isToday ? 'bg-brand-50' : ''
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        isToday ? 'text-brand-600' : 'text-surface-400'
                      }`}
                    >
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </p>
                    <p
                      className={`font-sans text-sm font-bold tabular-nums ${
                        isToday ? 'text-brand-700' : 'text-surface-600'
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="min-h-[140px] space-y-1.5 rounded-xl bg-surface-50 p-1.5">
                    <AnimatePresence>
                      {dayTasks.map((task) => renderWeekCard(task, true))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No-date row */}
          {week.noDate.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                No date ({week.noDate.length})
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                <AnimatePresence>
                  {week.noDate.map((task) => renderWeekCard(task, false))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(groupLabels) as TaskGroup[]).map((group) => {
            const groupTasks = grouped[group];
            if (groupTasks.length === 0) return null;

            return (
              <div key={group} className="space-y-2">
                <h2
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    group === 'overdue' ? 'text-red-400' : 'text-surface-400'
                  }`}
                >
                  {groupLabels[group]} ({groupTasks.length})
                </h2>
                <AnimatePresence>
                  {groupTasks.map((task) => {
                    const done = Boolean(task.completedAt);
                    const p = priorityStyles[task.priority];

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className="group flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3 transition-colors hover:border-surface-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={gentleSpring}
                      >
                        {/* Checkbox */}
                        <motion.button
                          type="button"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            done
                              ? 'border-brand-500 bg-brand-500'
                              : 'border-surface-300 bg-white hover:border-brand-400'
                          }`}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={spring}
                          onClick={() => toggleTask(task)}
                          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <AnimatePresence>
                            {done && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={spring}
                              >
                                <Check className="h-3 w-3 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>

                        {/* Title + meta */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm ${
                              done ? 'text-surface-300 line-through' : 'text-surface-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2.5 text-xs text-surface-400">
                            <span className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                              {p.label}
                            </span>
                            {task.subjectName && (
                              <span className="flex items-center gap-1">
                                {task.subjectColor && (
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: task.subjectColor }}
                                  />
                                )}
                                {task.subjectName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete */}
                        <motion.button
                          type="button"
                          className="text-surface-200 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteTask(task.id)}
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
