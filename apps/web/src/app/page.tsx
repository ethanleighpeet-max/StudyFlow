import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const features = [
  { name: 'Study', icon: '📖', color: 'brand' },
  { name: 'Habits', icon: '🌿', color: 'brand' },
  { name: 'Goals', icon: '🎯', color: 'secondary' },
  { name: 'Insights', icon: '✨', color: 'accent' },
] as const;

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
          StudyFlow
        </h1>
        <p className="max-w-md text-center text-lg text-surface-500 dark:text-surface-400">
          Study smarter. Live better. The first app that connects your study sessions with your
          daily wellbeing habits.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="flex h-28 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white text-sm font-medium text-surface-700 shadow-soft transition-all hover:border-brand-300 hover:shadow-card dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-600"
          >
            <span className="text-2xl">{feature.icon}</span>
            {feature.name}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link
          href="/sign-up"
          className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-600 hover:shadow-card"
        >
          Get Started Free
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-surface-300 bg-white px-6 py-3 text-sm font-semibold text-surface-700 transition-all hover:border-brand-300 hover:text-brand-600"
        >
          Sign In
        </Link>
      </div>

      <p className="text-sm text-surface-400">v0.1.0 — Design system active</p>
    </main>
  );
}
