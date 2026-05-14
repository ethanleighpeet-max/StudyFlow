'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  Clock,
  Star,
  StickyNote,
  BookOpen,
  Target,
  Smile,
  Meh,
  Frown,
  Laugh,
  Angry,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStudySession } from '@/stores/study-session';
import { useRouter } from 'next/navigation';

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface MoodOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

const MOODS: MoodOption[] = [
  { value: 'great', label: 'Great', icon: Laugh },
  { value: 'good', label: 'Good', icon: Smile },
  { value: 'okay', label: 'Okay', icon: Meh },
  { value: 'tired', label: 'Tired', icon: Frown },
  { value: 'frustrated', label: 'Frustrated', icon: Angry },
];

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SessionSummary() {
  const store = useStudySession();
  const router = useRouter();
  const [focusRating, setFocusRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!store.sessionId || isSaving) return;
    setIsSaving(true);

    await fetch(`/api/sessions/${store.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focusRating: focusRating || undefined,
        mood: selectedMood || undefined,
      }),
    });

    store.resetSession();
    router.push('/dashboard/study');
  };

  const handleSkip = () => {
    store.resetSession();
    router.push('/dashboard/study');
  };

  return (
    <motion.div
      className="mx-auto max-w-lg space-y-8 p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={gentleSpring}
    >
      {/* Success header */}
      <div className="text-center">
        <motion.div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-secondary-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
        >
          <CheckCircle className="h-8 w-8 text-brand-600" />
        </motion.div>
        <motion.h1
          className="font-heading text-2xl font-bold text-surface-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...gentleSpring }}
        >
          Session Complete!
        </motion.h1>
        <motion.p
          className="mt-1 text-sm text-surface-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Great work. Here&apos;s your summary.
        </motion.p>
      </div>

      {/* Stats summary */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ...gentleSpring }}
      >
        <SummaryStatCard
          icon={Clock}
          label="Duration"
          value={formatDuration(store.elapsedSeconds)}
          color="brand"
        />
        <SummaryStatCard
          icon={StickyNote}
          label="Notes"
          value={String(store.notes.length)}
          color="secondary"
        />
        <SummaryStatCard
          icon={BookOpen}
          label="Subject"
          value={store.subjectName ?? 'None'}
          color="accent"
        />
      </motion.div>

      {/* Goal display */}
      {store.sessionGoal && (
        <motion.div
          className="flex items-start gap-3 rounded-xl border border-surface-100 bg-surface-50/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-surface-400" />
          <div>
            <p className="text-xs font-medium text-surface-500">Session Goal</p>
            <p className="text-sm text-surface-700">{store.sessionGoal}</p>
          </div>
        </motion.div>
      )}

      {/* Focus rating */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...gentleSpring }}
      >
        <label className="text-sm font-medium text-surface-700">
          How focused were you?
        </label>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              className="p-1"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setFocusRating(star)}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredStar || focusRating)
                    ? 'fill-accent-400 text-accent-400'
                    : 'text-surface-200'
                }`}
              />
            </motion.button>
          ))}
        </div>
        {focusRating > 0 && (
          <motion.p
            className="text-center text-xs text-surface-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {focusRating <= 2
              ? "That's okay — every session counts!"
              : focusRating <= 4
                ? 'Nice focus! Keep it up.'
                : 'Incredible focus! You were in the zone.'}
          </motion.p>
        )}
      </motion.div>

      {/* Mood selector */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, ...gentleSpring }}
      >
        <label className="text-sm font-medium text-surface-700">
          How are you feeling?
        </label>
        <div className="flex justify-center gap-3">
          {MOODS.map(({ value, label, icon: Icon }) => (
            <motion.button
              key={value}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors ${
                selectedMood === value
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-surface-200 hover:border-surface-300'
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setSelectedMood(value)}
            >
              <Icon
                className={`h-5 w-5 ${
                  selectedMood === value ? 'text-brand-600' : 'text-surface-400'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  selectedMood === value ? 'text-brand-700' : 'text-surface-500'
                }`}
              >
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, ...gentleSpring }}
      >
        <motion.button
          className="flex-1 rounded-xl border border-surface-200 bg-white py-3 text-sm font-semibold text-surface-600 hover:bg-surface-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={handleSkip}
        >
          Skip
        </motion.button>
        <motion.button
          className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function SummaryStatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: 'brand' | 'secondary' | 'accent';
}) {
  const styles = {
    brand: { bg: 'bg-brand-50', icon: 'text-brand-500', value: 'text-brand-700' },
    secondary: { bg: 'bg-secondary-50', icon: 'text-secondary-500', value: 'text-secondary-700' },
    accent: { bg: 'bg-accent-50', icon: 'text-accent-500', value: 'text-accent-700' },
  };
  const s = styles[color];

  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl ${s.bg} p-4`}>
      <Icon className={`h-5 w-5 ${s.icon}`} />
      <span className={`font-sans text-lg font-bold tabular-nums ${s.value}`}>{value}</span>
      <span className="text-xs text-surface-500">{label}</span>
    </div>
  );
}
