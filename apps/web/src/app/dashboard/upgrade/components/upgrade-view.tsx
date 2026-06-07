'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { BadgeCheck, Check, Crown, Sparkles } from 'lucide-react';

const gentleSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

type Tier = 'free' | 'pro';
type BillingPeriod = 'monthly' | 'yearly';

const FREE_FEATURES = [
  'Study timer with session notes',
  'Up to 5 subjects',
  'Up to 3 active goals',
  'Daily habit & wellbeing tracking',
  '30 days of analytics history',
  '1 insight card',
];

const PRO_FEATURES = [
  'Unlimited subjects',
  'Full analytics & 12-month history',
  'Weekly progress reports',
  'Note search & export',
  'Custom timer intervals',
  'Priority support',
];

interface UpgradeViewProps {
  initialTier: Tier;
}

export function UpgradeView({ initialTier }: UpgradeViewProps) {
  const router = useRouter();
  const [tier, setTier] = useState<Tier>(initialTier);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPlan = useCallback(
    async (target: Tier) => {
      setBusy(true);
      setError(null);

      try {
        const res = await fetch('/api/billing/mock-upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: target }),
        });
        const json = await res.json();

        if (json.success) {
          setTier(json.data.premiumTier);
          router.refresh();
        } else {
          setError(json.error ?? 'Something went wrong');
        }
      } catch {
        setError('Something went wrong');
      }
      setBusy(false);
    },
    [router],
  );

  const isPro = tier === 'pro';

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-8 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-surface-900">
          {isPro ? 'You’re on Pro' : 'Upgrade to StudyFlow Pro'}
        </h1>
        <p className="mt-2 text-sm text-surface-500">
          {isPro
            ? 'Thanks for supporting StudyFlow — everything is unlocked.'
            : 'Unlock unlimited subjects, deeper insights, and weekly reports.'}
        </p>
      </div>

      {/* Billing period toggle */}
      {!isPro && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-surface-200 bg-white p-1 shadow-soft">
            {(['monthly', 'yearly'] as const).map((p) => (
              <motion.button
                key={p}
                type="button"
                className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === p ? 'text-white' : 'text-surface-500 hover:text-surface-900'
                }`}
                whileTap={{ scale: 0.96 }}
                transition={spring}
                onClick={() => setPeriod(p)}
              >
                {period === p && (
                  <motion.span
                    layoutId="billingPeriod"
                    className="absolute inset-0 rounded-full bg-brand-500"
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {p === 'monthly' ? 'Monthly' : 'Yearly'}
                  {p === 'yearly' && (
                    <span className="ml-1.5 rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                      −37%
                    </span>
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free card */}
        <motion.div
          className="flex flex-col rounded-2xl border border-surface-200 bg-white p-6 shadow-soft"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...gentleSpring }}
        >
          <h2 className="font-heading text-lg font-bold text-surface-900">Free</h2>
          <p className="mt-1 text-xs text-surface-400">Everything you need to get started</p>
          <p className="mt-4 font-sans text-3xl font-bold tabular-nums text-surface-900">
            €0
            <span className="text-sm font-medium text-surface-400"> / forever</span>
          </p>

          <ul className="mt-6 flex-1 space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-surface-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-surface-300" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {isPro ? (
              <motion.button
                type="button"
                className="w-full rounded-xl border border-surface-200 bg-white py-2.5 text-sm font-semibold text-surface-500 hover:border-surface-300 hover:text-surface-700 disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={spring}
                disabled={busy}
                onClick={() => setPlan('free')}
              >
                {busy ? 'Switching…' : 'Downgrade to Free'}
              </motion.button>
            ) : (
              <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-100 py-2.5 text-sm font-semibold text-surface-500">
                <BadgeCheck className="h-4 w-4" />
                Current plan
              </div>
            )}
          </div>
        </motion.div>

        {/* Pro card */}
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-accent-300 via-accent-400 to-accent-200 p-[1.5px] shadow-glow"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...gentleSpring }}
        >
          <div className="flex h-full flex-col rounded-[14px] bg-white p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-surface-900">Pro</h2>
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-400 to-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                <Crown className="h-3 w-3" />
                Recommended
              </span>
            </div>
            <p className="mt-1 text-xs text-surface-400">For students who want the full picture</p>
            <p className="mt-4 font-sans text-3xl font-bold tabular-nums text-surface-900">
              {period === 'monthly' ? '€3.99' : '€29.99'}
              <span className="text-sm font-medium text-surface-400">
                {' '}
                / {period === 'monthly' ? 'month' : 'year'}
              </span>
            </p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-surface-700">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {isPro ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-50 py-2.5 text-sm font-semibold text-accent-700">
                  <Crown className="h-4 w-4" />
                  You’re on Pro
                </div>
              ) : (
                <>
                  <motion.button
                    type="button"
                    className="w-full rounded-xl bg-gradient-to-r from-accent-400 to-accent-500 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={spring}
                    disabled={busy}
                    onClick={() => setPlan('pro')}
                  >
                    {busy ? 'Upgrading…' : 'Upgrade to Pro'}
                  </motion.button>
                  <p className="mt-2 text-center text-[11px] text-surface-400">
                    Demo checkout — no payment taken
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
