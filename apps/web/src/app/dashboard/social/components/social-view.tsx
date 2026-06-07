'use client';

// Social hub: friends with invite links, opt-in activity feed, group challenges
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Flag,
  Link2,
  LogOut,
  Plus,
  Shield,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };
const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };

const BURST_DOTS = [0, 1, 2, 3, 4, 5];

interface FriendEntry {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface FriendsData {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

interface ActivityEntry {
  name: string;
  avatarUrl: string | null;
  minutes: number;
  sessions: number;
}

interface ChallengeMemberProgress {
  userId: string;
  name: string;
  hours: number;
}

interface Challenge {
  id: string;
  name: string;
  targetHours: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  memberCount: number;
  totalHours: number;
  members: ChallengeMemberProgress[];
}

interface Notice {
  type: 'success' | 'error';
  text: string;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function maxEndDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function SocialView({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [friendsData, setFriendsData] = useState<FriendsData | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [shareActivity, setShareActivity] = useState<boolean | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedChallengeId, setCopiedChallengeId] = useState<string | null>(null);

  // Challenge create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState(10);
  const [formEndDate, setFormEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFriends = useCallback(async () => {
    const res = await fetch('/api/friends');
    const json = await res.json();
    if (json.success) setFriendsData(json.data);
  }, []);

  const loadActivity = useCallback(async () => {
    const res = await fetch('/api/friends/activity');
    const json = await res.json();
    if (json.success) setActivity(json.data);
  }, []);

  const loadChallenges = useCallback(async () => {
    const res = await fetch('/api/challenges');
    const json = await res.json();
    if (json.success) setChallenges(json.data);
  }, []);

  const loadPreferences = useCallback(async () => {
    const res = await fetch('/api/preferences');
    const json = await res.json();
    if (json.success) setShareActivity(json.data?.shareActivity === true);
  }, []);

  useEffect(() => {
    Promise.all([loadFriends(), loadActivity(), loadChallenges(), loadPreferences()])
      .catch(() => setNotice({ type: 'error', text: 'Failed to load social data' }))
      .finally(() => setLoading(false));
  }, [loadFriends, loadActivity, loadChallenges, loadPreferences]);

  // Handle invite / join links: ?add=<userId> or ?challenge=<id>
  const linkHandled = useRef(false);
  useEffect(() => {
    if (linkHandled.current) return;
    const addId = searchParams.get('add');
    const challengeId = searchParams.get('challenge');
    if (!addId && !challengeId) return;
    linkHandled.current = true;

    const run = async (): Promise<void> => {
      if (addId) {
        if (addId === currentUserId) {
          setNotice({ type: 'error', text: 'That is your own invite link — share it with a friend!' });
        } else {
          const res = await fetch('/api/friends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: addId }),
          });
          const json = await res.json();
          setNotice(
            json.success
              ? { type: 'success', text: 'Friend request sent!' }
              : { type: 'error', text: json.error ?? 'Could not send friend request' },
          );
          await loadFriends();
        }
      }

      if (challengeId) {
        const res = await fetch(`/api/challenges/${challengeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join' }),
        });
        const json = await res.json();
        setNotice(
          json.success
            ? { type: 'success', text: 'You joined the challenge — good luck together!' }
            : { type: 'error', text: json.error ?? 'Could not join the challenge' },
        );
        await loadChallenges();
      }

      router.replace('/dashboard/social');
    };

    void run().catch(() => {
      setNotice({ type: 'error', text: 'Something went wrong with that link' });
      router.replace('/dashboard/social');
    });
  }, [searchParams, currentUserId, router, loadFriends, loadChallenges]);

  const copyInviteLink = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/invite');
      const json = await res.json();
      if (json.success && json.data?.url) {
        await navigator.clipboard.writeText(json.data.url);
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
      }
    } catch {
      setNotice({ type: 'error', text: 'Could not copy the invite link' });
    }
  }, []);

  const respondToRequest = useCallback(
    async (id: string, action: 'accept' | 'decline') => {
      const res = await fetch(`/api/friends/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        await loadFriends();
        if (action === 'accept') await loadActivity();
      }
    },
    [loadFriends, loadActivity],
  );

  const removeFriendship = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) await loadFriends();
    },
    [loadFriends],
  );

  const toggleShareActivity = useCallback(async () => {
    const next = !(shareActivity === true);
    setShareActivity(next);
    const res = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareActivity: next }),
    });
    const json = await res.json();
    if (!json.success) {
      setShareActivity(!next);
      return;
    }
    await loadActivity();
  }, [shareActivity, loadActivity]);

  const createChallenge = useCallback(async () => {
    if (!formName.trim() || !formEndDate) return;
    setSubmitting(true);
    setNotice(null);
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        targetHours: formTarget,
        endDate: new Date(`${formEndDate}T23:59:59`).toISOString(),
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) {
      setShowForm(false);
      setFormName('');
      setFormTarget(10);
      setFormEndDate('');
      await loadChallenges();
    } else {
      setNotice({ type: 'error', text: json.error ?? 'Failed to create challenge' });
    }
  }, [formName, formTarget, formEndDate, loadChallenges]);

  const leaveChallenge = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setChallenges((prev) => prev.filter((c) => c.id !== id));
      }
    },
    [],
  );

  const copyJoinLink = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/social?challenge=${id}`);
      setCopiedChallengeId(id);
      setTimeout(() => setCopiedChallengeId(null), 2000);
    } catch {
      setNotice({ type: 'error', text: 'Could not copy the join link' });
    }
  }, []);

  const friends = friendsData?.friends ?? [];
  const incoming = friendsData?.incoming ?? [];
  const outgoing = friendsData?.outgoing ?? [];
  const hasAnyFriendData = friends.length > 0 || incoming.length > 0 || outgoing.length > 0;

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-8 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-surface-900">Social</h1>
          <p className="text-sm text-surface-500">
            Study together — encouragement over competition
          </p>
        </div>
        <motion.button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={copyInviteLink}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copiedInvite ? (
              <motion.span
                key="copied"
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring}
              >
                <Check className="h-4 w-4" />
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring}
              >
                <Link2 className="h-4 w-4" />
                Copy invite link
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Feedback banner */}
      <AnimatePresence>
        {notice && (
          <motion.div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-brand-100 bg-brand-50 text-brand-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={gentleSpring}
          >
            {notice.text}
            <button
              type="button"
              className="ml-3 opacity-60 hover:opacity-100"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ Friends ============ */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-surface-900">
          <Users className="h-4 w-4 text-brand-600" />
          Friends
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-100" />
            ))}
          </div>
        ) : !hasAnyFriendData ? (
          <motion.div
            className="flex flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <UserPlus className="h-7 w-7 text-brand-400" />
            </motion.div>
            <p className="max-w-[280px] text-sm text-surface-500">
              Studying is better together. Copy your invite link and send it to a friend to get
              started.
            </p>
            <motion.button
              type="button"
              className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={copyInviteLink}
            >
              <Link2 className="h-3.5 w-3.5" />
              {copiedInvite ? 'Copied!' : 'Copy invite link'}
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {/* Incoming requests */}
            <AnimatePresence>
              {incoming.map((req) => (
                <motion.div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-accent-100 bg-accent-50/50 px-4 py-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={gentleSpring}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={req.name} avatarUrl={req.avatarUrl} />
                    <div>
                      <p className="text-sm font-medium text-surface-900">{req.name}</p>
                      <p className="text-xs text-surface-400">wants to be your study buddy</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={spring}
                      onClick={() => respondToRequest(req.id, 'accept')}
                      aria-label={`Accept ${req.name}`}
                    >
                      <Check className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-400 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={spring}
                      onClick={() => respondToRequest(req.id, 'decline')}
                      aria-label={`Decline ${req.name}`}
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Accepted friends */}
            <AnimatePresence>
              {friends.map((friend, i) => (
                <motion.div
                  key={friend.id}
                  className="flex items-center justify-between rounded-xl border border-surface-100 bg-white px-4 py-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04, ...gentleSpring }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={friend.name} avatarUrl={friend.avatarUrl} />
                    <p className="text-sm font-medium text-surface-900">{friend.name}</p>
                  </div>
                  <motion.button
                    type="button"
                    className="text-xs font-medium text-surface-300 hover:text-red-400"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeFriendship(friend.id)}
                  >
                    Remove
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Outgoing pending */}
            <AnimatePresence>
              {outgoing.map((req) => (
                <motion.div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-dashed border-surface-200 bg-surface-50/40 px-4 py-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={gentleSpring}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={req.name} avatarUrl={req.avatarUrl} />
                    <div>
                      <p className="text-sm font-medium text-surface-700">{req.name}</p>
                      <p className="text-xs text-surface-400">Request pending</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    className="text-xs font-medium text-surface-400 hover:text-red-400"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeFriendship(req.id)}
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ============ Activity (opt-in) ============ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-surface-900">
            <Sparkles className="h-4 w-4 text-secondary-600" />
            Friend Activity
          </h2>

          {/* Share toggle */}
          <button
            type="button"
            className="flex items-center gap-2.5"
            onClick={toggleShareActivity}
            disabled={shareActivity === null}
          >
            <span className="text-xs font-medium text-surface-500">
              Share my study activity
            </span>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                shareActivity ? 'bg-brand-500' : 'bg-surface-200'
              }`}
            >
              <motion.span
                className="absolute h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ x: shareActivity ? 22 : 2 }}
                transition={spring}
              />
            </span>
          </button>
        </div>

        {shareActivity ? (
          activity.length === 0 ? (
            <div className="rounded-2xl border border-surface-200 bg-white px-5 py-8 text-center">
              <p className="text-sm text-surface-400">
                No friend activity yet today. When friends who share their activity finish a
                session, it shows up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {activity.map((entry, i) => (
                  <motion.div
                    key={entry.name}
                    className="flex items-center gap-3 rounded-xl border border-surface-100 bg-white px-4 py-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ...gentleSpring }}
                  >
                    <Avatar name={entry.name} avatarUrl={entry.avatarUrl} />
                    <p className="text-sm text-surface-700">
                      <span className="font-semibold text-surface-900">{entry.name}</span> studied{' '}
                      <span className="font-sans font-semibold tabular-nums text-brand-600">
                        {formatMinutes(entry.minutes)}
                      </span>{' '}
                      today
                      {entry.sessions > 1 && (
                        <span className="text-surface-400">
                          {' '}
                          across{' '}
                          <span className="font-sans tabular-nums">{entry.sessions}</span> sessions
                        </span>
                      )}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          <motion.div
            className="flex items-start gap-4 rounded-2xl border border-surface-200 bg-surface-50/50 p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100">
              <Shield className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900">Your activity is private</h3>
              <p className="mt-1 text-sm text-surface-500">
                Sharing is off. Turn it on to see what your friends are studying today — and let
                them see your study time too. Only total minutes and session counts are shared,
                never your notes or subjects. You can switch this off anytime.
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {/* ============ Group Challenges ============ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-surface-900">
            <Flag className="h-4 w-4 text-accent-600" />
            Group Challenges
          </h2>
          <motion.button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Cancel' : 'New Challenge'}
          </motion.button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="space-y-4 overflow-hidden rounded-2xl border border-accent-100 bg-white p-5 shadow-soft"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={gentleSpring}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="space-y-1.5 sm:col-span-3">
                  <span className="text-xs font-medium text-surface-500">Challenge name</span>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Exam week sprint"
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-accent-300 focus:ring-2 focus:ring-accent-100"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-surface-500">Group target (hours)</span>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-accent-300 focus:ring-2 focus:ring-accent-100"
                    value={formTarget}
                    onChange={(e) => setFormTarget(Number(e.target.value))}
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-surface-500">
                    End date (within 30 days)
                  </span>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    max={maxEndDateISO()}
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 outline-none transition-all focus:border-accent-300 focus:ring-2 focus:ring-accent-100"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </label>
              </div>

              <motion.button
                type="button"
                className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={spring}
                disabled={submitting || !formName.trim() || formTarget < 1 || !formEndDate}
                onClick={createChallenge}
              >
                {submitting ? 'Creating…' : 'Create Challenge'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenge cards */}
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-surface-100" />
        ) : challenges.length === 0 && !showForm ? (
          <motion.div
            className="flex flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="h-7 w-7 text-accent-400" />
            </motion.div>
            <p className="max-w-[280px] text-sm text-surface-500">
              Team up with friends on a shared study goal — everyone&apos;s hours count toward the
              same target.
            </p>
            <motion.button
              type="button"
              className="mt-4 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setShowForm(true)}
            >
              Start a Challenge
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {challenges.map((challenge, i) => {
                const pct = Math.min(
                  100,
                  Math.round((challenge.totalHours / challenge.targetHours) * 100),
                );
                const achieved = challenge.totalHours >= challenge.targetHours;
                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000),
                );

                return (
                  <motion.div
                    key={challenge.id}
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
                          <span className="font-medium text-surface-900">{challenge.name}</span>
                          <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                            <span className="font-sans tabular-nums">{challenge.memberCount}</span>
                            {' '}member{challenge.memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <motion.button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyJoinLink(challenge.id)}
                          >
                            {copiedChallengeId === challenge.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Link2 className="h-3 w-3" />
                                Copy join link
                              </>
                            )}
                          </motion.button>
                          <motion.button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium text-surface-300 hover:text-red-400"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => leaveChallenge(challenge.id)}
                            aria-label={`Leave ${challenge.name}`}
                          >
                            <LogOut className="h-3 w-3" />
                            Leave
                          </motion.button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <p className="font-sans text-xl font-bold tabular-nums text-surface-900">
                          {challenge.totalHours}h
                          <span className="text-sm font-medium text-surface-400">
                            {' '}
                            / {challenge.targetHours}h together
                          </span>
                        </p>
                        <span className="text-xs text-surface-400">
                          {achieved ? (
                            'Target reached — amazing teamwork!'
                          ) : (
                            <>
                              <span className="font-sans tabular-nums">{daysLeft}</span> day
                              {daysLeft !== 1 ? 's' : ''} left
                            </>
                          )}
                        </span>
                      </div>

                      {/* Collective progress bar */}
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

                      {/* Member chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {challenge.members.map((member) => (
                          <span
                            key={member.userId}
                            className="flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-600"
                          >
                            <span className="font-medium">
                              {member.userId === currentUserId ? 'You' : member.name}
                            </span>
                            <span className="font-sans font-semibold tabular-nums text-brand-600">
                              {member.hours}h
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </motion.div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full border border-surface-100 object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  );
}
