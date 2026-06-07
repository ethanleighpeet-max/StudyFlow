'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useClerk } from '@clerk/nextjs';
import {
  BookOpen,
  Check,
  Crown,
  Download,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

const COLOR_PALETTE = [
  '#0F8B8D', // brand teal
  '#7C6FAE', // soft violet
  '#E09F3E', // warm amber
  '#6366F1', // indigo (default)
  '#E2725B', // terracotta
  '#4C9F70', // sage green
  '#C75C8A', // rose
  '#4A7FB5', // steel blue
];

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface ProfileViewProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  memberSince: string;
  premiumTier: 'free' | 'pro';
}

export function ProfileView({
  name,
  email,
  avatarUrl,
  memberSince,
  premiumTier,
}: ProfileViewProps) {
  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      <div>
        <h1 className="font-heading text-2xl font-bold text-surface-900">Profile</h1>
        <p className="text-sm text-surface-500">Your account, subjects, and data</p>
      </div>

      {/* Identity card */}
      <motion.div
        className="flex items-center gap-5 rounded-2xl border border-surface-200 bg-white p-6 shadow-soft"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={gentleSpring}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="h-16 w-16 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 font-heading text-2xl font-bold text-white shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-heading text-lg font-bold text-surface-900">{name}</h2>
            {premiumTier === 'pro' ? (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-400 to-accent-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                <Crown className="h-3 w-3" />
                Pro
              </span>
            ) : (
              <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-500">
                Free
              </span>
            )}
          </div>
          <p className="truncate text-sm text-surface-500">{email}</p>
          <p className="mt-1 text-xs text-surface-400">
            Member since{' '}
            {new Date(memberSince).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {premiumTier === 'free' && (
          <Link href="/dashboard/upgrade">
            <motion.span
              className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              Upgrade
            </motion.span>
          </Link>
        )}
      </motion.div>

      <SubjectsManager />

      <GdprSection />
    </motion.div>
  );
}

// ==================== Subjects manager ====================

function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierLimited, setTierLimited] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSubjects(json.data);
        else setError(json.error ?? 'Failed to load subjects');
      })
      .catch(() => setError('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renameSubject = useCallback(
    async (id: string) => {
      const trimmed = editName.trim();
      setEditingId(null);
      if (!trimmed) return;

      const res = await fetch(`/api/subjects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s)));
      } else {
        setError(json.error ?? 'Failed to rename subject');
      }
    },
    [editName],
  );

  const recolorSubject = useCallback(async (id: string, color: string) => {
    setColorPickerId(null);
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));

    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? 'Failed to update colour');
    }
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    setConfirmDeleteId(null);
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } else {
      setError(json.error ?? 'Failed to delete subject');
    }
  }, []);

  const createSubject = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);
    setTierLimited(false);

    const color = COLOR_PALETTE[subjects.length % COLOR_PALETTE.length] ?? '#0F8B8D';
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, color }),
    });
    const json = await res.json();
    setCreating(false);

    if (json.success) {
      setNewName('');
      setSubjects((prev) => [...prev, json.data]);
    } else {
      setError(json.error ?? 'Failed to create subject');
      if (json.code === 'TIER_LIMIT') setTierLimited(true);
    }
  }, [newName, subjects.length]);

  return (
    <motion.section
      className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, ...gentleSpring }}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-brand-500" />
        <h2 className="font-heading text-base font-bold text-surface-900">Subjects</h2>
        <span className="font-sans text-xs tabular-nums text-surface-400">
          {subjects.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-surface-400">
        Click a name to rename it, or the dot to change its colour. Deleting a subject keeps
        your session history.
      </p>

      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
            {tierLimited && (
              <Link
                href="/dashboard/upgrade"
                className="ml-2 font-semibold text-brand-600 underline underline-offset-2"
              >
                Upgrade
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-surface-100" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-1.5">
          <AnimatePresence>
            {subjects.map((subject) => (
              <motion.div
                key={subject.id}
                layout
                className="rounded-xl border border-surface-100 px-3 py-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={gentleSpring}
              >
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    className="h-4 w-4 shrink-0 rounded-full ring-2 ring-transparent transition-shadow hover:ring-surface-200"
                    style={{ backgroundColor: subject.color }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    aria-label="Change colour"
                    onClick={() =>
                      setColorPickerId((v) => (v === subject.id ? null : subject.id))
                    }
                  />

                  {editingId === subject.id ? (
                    <input
                      autoFocus
                      className="flex-1 rounded-lg border border-brand-200 bg-white px-2 py-1 text-sm text-surface-900 outline-none ring-2 ring-brand-100"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => renameSubject(subject.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameSubject(subject.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex-1 truncate rounded-lg px-2 py-1 text-left text-sm font-medium text-surface-900 hover:bg-surface-50"
                      onClick={() => {
                        setEditingId(subject.id);
                        setEditName(subject.name);
                      }}
                    >
                      {subject.name}
                    </button>
                  )}

                  {confirmDeleteId === subject.id ? (
                    <div className="flex items-center gap-1">
                      <motion.button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                        onClick={() => deleteSubject(subject.id)}
                      >
                        <Check className="h-3 w-3" />
                        Delete
                      </motion.button>
                      <motion.button
                        type="button"
                        className="rounded-lg p-1 text-surface-400 hover:text-surface-600"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Cancel delete"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      className="text-surface-300 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Delete subject"
                      onClick={() => setConfirmDeleteId(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>

                {/* Colour swatch picker */}
                <AnimatePresence>
                  {colorPickerId === subject.id && (
                    <motion.div
                      className="flex items-center gap-2 overflow-hidden pl-7 pt-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={gentleSpring}
                    >
                      {COLOR_PALETTE.map((hex) => (
                        <motion.button
                          key={hex}
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ backgroundColor: hex }}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          transition={spring}
                          aria-label={`Set colour ${hex}`}
                          onClick={() => recolorSubject(subject.id, hex)}
                        >
                          {subject.color.toLowerCase() === hex.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {subjects.length === 0 && (
            <p className="rounded-xl border border-dashed border-surface-200 px-3 py-4 text-center text-sm text-surface-400">
              No subjects yet — add your first one below.
            </p>
          )}

          {/* Create new */}
          <div className="flex items-center gap-2 pt-2">
            <input
              className="flex-1 rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              placeholder="New subject name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createSubject();
              }}
            />
            <motion.button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              disabled={creating || !newName.trim()}
              onClick={createSubject}
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Adding…' : 'Add'}
            </motion.button>
          </div>
        </div>
      )}
    </motion.section>
  );
}

// ==================== GDPR section ====================

function GdprSection() {
  const { signOut } = useClerk();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteAccount = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      const json = await res.json();

      if (json.success) {
        await signOut({ redirectUrl: '/' });
      } else {
        setDeleteError(json.error ?? 'Failed to delete account');
        setDeleting(false);
      }
    } catch {
      setDeleteError('Failed to delete account');
      setDeleting(false);
    }
  }, [signOut]);

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, ...gentleSpring }}
    >
      {/* Data export */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-200 bg-white p-6 shadow-soft">
        <div>
          <h2 className="font-heading text-base font-bold text-surface-900">Export your data</h2>
          <p className="mt-1 text-xs text-surface-400">
            Download everything StudyFlow has stored about you as a JSON file (GDPR Art. 20).
          </p>
        </div>
        <a href="/api/account/export" download>
          <motion.span
            className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-2 text-sm font-semibold text-surface-700 shadow-sm hover:border-brand-200 hover:text-brand-600"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
          >
            <Download className="h-4 w-4" />
            Export
          </motion.span>
        </a>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <h2 className="font-heading text-base font-bold text-red-700">Danger zone</h2>
        </div>
        <p className="mt-1 text-xs text-red-500/80">
          Permanently delete your account and all data — subjects, sessions, notes, habits,
          goals, tasks, and reflections. This cannot be undone.
        </p>

        <AnimatePresence>
          {deleteError && (
            <motion.p
              className="mt-3 text-sm font-medium text-red-600"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {deleteError}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-surface-900 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-100"
            placeholder="Type DELETE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <motion.button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
            disabled={confirmText !== 'DELETE' || deleting}
            onClick={deleteAccount}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete account'}
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
