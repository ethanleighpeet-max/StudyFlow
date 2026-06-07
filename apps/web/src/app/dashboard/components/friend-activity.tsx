'use client';

// Compact friend-activity feed for the dashboard. Self-fetches /api/friends/activity
// and renders nothing when sharing is off or there's no activity today.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Users } from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface ActivityEntry {
  name: string;
  avatarUrl: string | null;
  minutes: number;
  sessions: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function FriendActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch('/api/friends/activity')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setEntries(json.data);
        }
      })
      .catch(() => {});
  }, []);

  if (entries.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
            <Users className="h-4 w-4 text-brand-600" />
          </div>
          <h2 className="font-heading text-base font-semibold text-surface-900">
            Friends Studying Today
          </h2>
        </div>
        <Link
          href="/dashboard/social"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Open social
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.name}
            className="flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/40 px-4 py-2.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06, ...gentleSpring }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {entry.name.charAt(0).toUpperCase() || '?'}
            </span>
            <p className="text-sm text-surface-700">
              <span className="font-semibold text-surface-900">{entry.name}</span> studied{' '}
              <span className="font-sans font-semibold tabular-nums text-brand-600">
                {formatMinutes(entry.minutes)}
              </span>{' '}
              today
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
