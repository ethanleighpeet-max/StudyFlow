'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Star,
  StickyNote,
  BookOpen,
  Calendar,
  Search,
  Timer,
  Infinity as InfinityIcon,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface SessionRecord {
  id: string;
  subjectName: string | null;
  subjectColor: string | null;
  startedAt: string;
  endedAt: string | null;
  timerMode: string;
  timerDurationMinutes: number | null;
  focusRating: number | null;
  mood: string | null;
  sessionGoal: string | null;
  notesCount: number;
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In progress';
  const diff = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const timerModeIcons: Record<string, typeof Timer> = {
  pomodoro: Timer,
  custom: Clock,
  'open-ended': InfinityIcon,
};

export function SessionHistory() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  // Debounced server-side search — also searches inside note content
  useEffect(() => {
    const handle = setTimeout(
      () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        fetch(`/api/sessions?${params}`)
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              setSessions(res.data);
              setTotal(res.meta.total);
            }
          })
          .finally(() => setLoading(false));
      },
      searchQuery ? 300 : 0,
    );
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const filtered = sessions;

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/study"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-400 hover:bg-surface-50 hover:text-surface-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-surface-900">Study Log</h1>
            <p className="text-sm text-surface-500">
              {total} session{total !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Search notes, subjects, goals, or moods..."
          className="w-full rounded-xl border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-surface-100"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
            <BookOpen className="h-7 w-7 text-brand-400" />
          </motion.div>
          <p className="text-sm text-surface-500">
            {searchQuery ? 'No sessions match your search.' : 'No study sessions yet.'}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/study"
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Start Your First Session
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session, i) => {
            const ModeIcon = timerModeIcons[session.timerMode] ?? Timer;

            return (
              <motion.div
                key={session.id}
                className="rounded-2xl border border-surface-200 bg-white p-5 transition-colors hover:border-surface-300"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ...gentleSpring }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {session.subjectColor && (
                      <div
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: session.subjectColor }}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-900">
                          {session.subjectName ?? 'No subject'}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                          <ModeIcon className="h-3 w-3" />
                          {session.timerMode}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-surface-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.startedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(session.startedAt, session.endedAt)}
                        </span>
                        {session.notesCount > 0 && (
                          <span className="flex items-center gap-1">
                            <StickyNote className="h-3 w-3" />
                            {session.notesCount} note{session.notesCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {session.sessionGoal && (
                        <p className="mt-2 text-xs text-surface-500">
                          Goal: {session.sessionGoal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Focus rating */}
                  {session.focusRating && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= session.focusRating!
                              ? 'fill-accent-400 text-accent-400'
                              : 'text-surface-200'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
     