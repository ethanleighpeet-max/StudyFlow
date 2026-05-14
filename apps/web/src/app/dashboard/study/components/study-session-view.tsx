'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Square,
  Timer,
  Clock,
  Infinity,
  Plus,
  BookOpen,
  Target,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStudySession } from '@/stores/study-session';
import { SessionNotes } from './session-notes';
import { SessionSummary } from './session-summary';

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface Subject {
  id: string;
  name: string;
  color: string;
}

const TIMER_MODES = [
  { mode: 'pomodoro' as const, label: 'Pomodoro', icon: Timer, desc: '25 min focus' },
  { mode: 'custom' as const, label: 'Custom', icon: Clock, desc: 'Set your time' },
  { mode: 'open-ended' as const, label: 'Open-Ended', icon: Infinity, desc: 'No limit' },
];

const CUSTOM_DURATIONS = [15, 30, 45, 60, 90];

export function StudySessionView() {
  const store = useStudySession();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop the tick interval based on session status
  useEffect(() => {
    if (store.status === 'running') {
      intervalRef.current = setInterval(() => {
        store.tick();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [store.status]);

  if (store.status === 'completed') {
    return <SessionSummary />;
  }

  if (store.status === 'idle') {
    return <SessionSetup />;
  }

  return <ActiveTimer />;
}

// ============================================================
// Session Setup — choose subject, mode, and start
// ============================================================

function SessionSetup() {
  const store = useStudySession();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [customMinutes, setCustomMinutes] = useState(30);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSubjects(res.data);
      });
  }, []);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setSubjects((prev) => [...prev, data.data]);
      store.setSubject(data.data.id, data.data.name);
      setNewSubjectName('');
      setShowNewSubject(false);
    }
  };

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);

    if (store.timerMode === 'custom') {
      store.setCustomDuration(customMinutes);
    }

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: store.subjectId ?? undefined,
        timerMode: store.timerMode,
        timerDurationMinutes:
          store.timerMode === 'custom'
            ? customMinutes
            : store.timerMode === 'pomodoro'
              ? 25
              : undefined,
        sessionGoal: store.sessionGoal || undefined,
      }),
    });
    const data = await res.json();

    if (data.success) {
      store.startSession(data.data.id);
    }
    setIsStarting(false);
  };

  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-8 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-surface-900">Start Study Session</h1>
        <p className="mt-1 text-sm text-surface-500">Pick a subject, set your timer, and focus.</p>
      </div>

      {/* Subject selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-surface-700">Subject (optional)</label>
        <div className="flex flex-wrap gap-2">
          <motion.button
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              !store.subjectId
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300'
            }`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => store.setSubject(null, null)}
          >
            No subject
          </motion.button>

          {subjects.map((sub) => (
            <motion.button
              key={sub.id}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                store.subjectId === sub.id
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={() => store.setSubject(sub.id, sub.name)}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: sub.color }}
              />
              {sub.name}
            </motion.button>
          ))}

          <motion.button
            className="flex items-center gap-1 rounded-xl border border-dashed border-surface-300 px-4 py-2 text-sm font-medium text-surface-400 hover:border-brand-300 hover:text-brand-600"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => setShowNewSubject(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add subject
          </motion.button>
        </div>

        <AnimatePresence>
          {showNewSubject && (
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="text"
                placeholder="e.g. Mathematics"
                className="flex-1 rounded-xl border border-surface-200 bg-white px-4 py-2 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                autoFocus
              />
              <motion.button
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreateSubject}
              >
                Add
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timer mode */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-surface-700">Timer Mode</label>
        <div className="grid grid-cols-3 gap-3">
          {TIMER_MODES.map(({ mode, label, icon: Icon, desc }) => (
            <TimerModeCard
              key={mode}
              icon={Icon}
              label={label}
              description={desc}
              isActive={store.timerMode === mode}
              onClick={() => store.setTimerMode(mode)}
            />
          ))}
        </div>

        <AnimatePresence>
          {store.timerMode === 'custom' && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-wrap gap-2 pt-2">
                {CUSTOM_DURATIONS.map((min) => (
                  <motion.button
                    key={min}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      customMinutes === min
                        ? 'border-brand-200 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCustomMinutes(min)}
                  >
                    {min} min
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session goal */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-surface-700">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-surface-400" />
            Session Goal (optional)
          </span>
        </label>
        <input
          type="text"
          placeholder="e.g. Finish Chapter 5 exercises"
          className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          value={store.sessionGoal}
          onChange={(e) => store.setSessionGoal(e.target.value)}
        />
      </div>

      {/* Start button */}
      <motion.button
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 py-4 text-lg font-bold text-white shadow-lg shadow-brand-500/25"
        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(15, 139, 141, 0.3)' }}
        whileTap={{ scale: 0.98 }}
        transition={spring}
        onClick={handleStart}
        disabled={isStarting}
      >
        <Play className="h-6 w-6" />
        {isStarting ? 'Starting...' : 'Start Session'}
      </motion.button>
    </motion.div>
  );
}

function TimerModeCard({
  icon: Icon,
  label,
  description,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors ${
        isActive
          ? 'border-brand-200 bg-brand-50'
          : 'border-surface-200 bg-white hover:border-surface-300'
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      onClick={onClick}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-brand-400"
          layoutId="timerModeActive"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isActive ? 'bg-brand-100 text-brand-600' : 'bg-surface-100 text-surface-500'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span
        className={`text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-surface-700'}`}
      >
        {label}
      </span>
      <span className="text-xs text-surface-400">{description}</span>
    </motion.button>
  );
}

// ============================================================
// Active Timer — running/paused states
// ============================================================

function ActiveTimer() {
  const store = useStudySession();
  const isOpenEnded = store.timerMode === 'open-ended';
  const displaySeconds = isOpenEnded
    ? store.elapsedSeconds
    : store.remainingSeconds();
  const progress = store.progressPercent();

  const hours = Math.floor(displaySeconds / 3600);
  const minutes = Math.floor((displaySeconds % 3600) / 60);
  const seconds = displaySeconds % 60;
  const timeDisplay =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleStop = async () => {
    if (!store.sessionId) return;

    await fetch(`/api/sessions/${store.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    store.completeSession();
  };

  // SVG circular progress
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isOpenEnded ? 0 : circumference * (1 - progress / 100);

  return (
    <div className="flex h-full gap-0">
      {/* Timer area */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={gentleSpring}
      >
        {/* Subject + goal */}
        {(store.subjectName || store.sessionGoal) && (
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...gentleSpring }}
          >
            {store.subjectName && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-brand-600">
                <BookOpen className="h-4 w-4" />
                {store.subjectName}
              </div>
            )}
            {store.sessionGoal && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-surface-500">
                <Target className="h-3.5 w-3.5" />
                {store.sessionGoal}
              </p>
            )}
          </motion.div>
        )}

        {/* Circular timer */}
        <div className="relative flex items-center justify-center">
          <svg width="320" height="320" viewBox="0 0 320 320">
            {/* Background circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-surface-100"
              strokeWidth="6"
            />
            {/* Progress arc */}
            {!isOpenEnded && (
              <motion.circle
                cx="160"
                cy="160"
                r={radius}
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 160 160)"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            )}
            {/* Pulse ring when running */}
            {store.status === 'running' && (
              <motion.circle
                cx="160"
                cy="160"
                r={radius + 8}
                fill="none"
                stroke="currentColor"
                className="text-brand-200"
                strokeWidth="2"
                animate={{ opacity: [0.3, 0.8, 0.3], r: [radius + 6, radius + 12, radius + 6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <defs>
              <linearGradient id="timerGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F8B8D" />
                <stop offset="100%" stopColor="#7C6FAE" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time text */}
          <div className="absolute flex flex-col items-center">
            <motion.span
              className="font-sans text-5xl font-bold tabular-nums text-surface-900"
              key={timeDisplay}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
            >
              {timeDisplay}
            </motion.span>
            <span className="mt-1 text-sm text-surface-400">
              {isOpenEnded ? 'elapsed' : 'remaining'}
            </span>
            {store.status === 'paused' && (
              <motion.span
                className="mt-2 rounded-full bg-accent-100 px-3 py-0.5 text-xs font-semibold text-accent-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Paused
              </motion.span>
            )}
          </div>
        </div>

        {/* Controls */}
        <motion.div
          className="mt-8 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...gentleSpring }}
        >
          {/* Play/Pause */}
          <motion.button
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() =>
              store.status === 'running' ? store.pauseSession() : store.resumeSession()
            }
          >
            {store.status === 'running' ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="ml-1 h-7 w-7" />
            )}
          </motion.button>

          {/* Stop */}
          <motion.button
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-surface-200 bg-white text-surface-500 hover:border-red-200 hover:text-red-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={handleStop}
          >
            <Square className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Notes panel */}
      <SessionNotes />
    </div>
  );
}
