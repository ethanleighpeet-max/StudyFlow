'use client';

// Morning check-in: quick sleep + mood logging shown before noon if sleep isn't logged yet
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Sunrise, X } from 'lucide-react';

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'] as const;

export function MorningCheckin({ sleepHours }: { sleepHours: number | null }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [sleepInput, setSleepInput] = useState(7.5);
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const hour = new Date().getHours();
  const visible = hour < 12 && sleepHours === null && !dismissed;

  const save = async (): Promise<void> => {
    if (mood === null) return;
    setSaving(true);
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sleep', value: sleepInput }),
      });
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mood', value: mood }),
      });
      setDismissed(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary-500 via-secondary-600 to-brand-600 p-6 text-white shadow-lg"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: -32, overflow: 'hidden' }}
          transition={gentleSpring}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-accent-400/10" />

          <motion.button
            type="button"
            className="absolute right-4 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => setDismissed(true)}
            aria-label="Dismiss check-in"
          >
            <X className="h-4 w-4" />
          </motion.button>

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-secondary-100">
              <Sunrise className="h-4 w-4" />
              <span className="text-sm font-medium">Good morning — quick check-in</span>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Sleep slider */}
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-white/70">How long did you sleep?</span>
                  <span className="font-sans text-lg font-bold tabular-nums">{sleepInput}h</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={sleepInput}
                  onChange={(e) => setSleepInput(Number(e.target.value))}
                  className="mt-1 w-full accent-white"
                  aria-label="Hours of sleep"
                />
              </div>

              {/* Mood emojis */}
              <div className="flex items-center gap-1.5">
                {MOOD_EMOJIS.map((emoji, i) => {
                  const value = i + 1;
                  const isSelected = mood === value;
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-colors ${
                        isSelected ? 'bg-white/30 ring-2 ring-white' : 'bg-white/10 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.15, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      transition={spring}
                      onClick={() => setMood(value)}
                      aria-label={`Mood ${value} of 5`}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </div>

              {/* Save */}
              <motion.button
                type="button"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-secondary-700 shadow-md disabled:opacity-50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                disabled={mood === null || saving}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
