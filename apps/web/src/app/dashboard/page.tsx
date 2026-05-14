import { auth, currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-surface-900">
          Welcome back, {user?.firstName ?? 'there'}
        </h1>
        <p className="mt-1 text-surface-500">
          Here&apos;s how your study and wellbeing are looking today.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Study Time Today"
          value="0h 0m"
          subtitle="No sessions yet"
          color="brand"
        />
        <StatCard
          title="Focus Score"
          value="--"
          subtitle="Start a session to track"
          color="secondary"
        />
        <StatCard
          title="Habits Logged"
          value="0 / 5"
          subtitle="Log your first habit"
          color="accent"
        />
        <StatCard
          title="Active Streak"
          value="0 days"
          subtitle="Start your streak today"
          color="brand"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-soft">
          <h2 className="font-heading text-lg font-semibold text-surface-900">
            Recent Study Sessions
          </h2>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-surface-50">
            <p className="text-sm text-surface-400">
              Your study sessions will appear here
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-soft">
          <h2 className="font-heading text-lg font-semibold text-surface-900">
            Today&apos;s Habits
          </h2>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-surface-50">
            <p className="text-sm text-surface-400">
              Your habit tracker will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: 'brand' | 'secondary' | 'accent';
}) {
  const colorClasses = {
    brand: 'border-brand-100 bg-brand-50/50',
    secondary: 'border-secondary-100 bg-secondary-50/50',
    accent: 'border-accent-100 bg-accent-50/50',
  };

  const valueClasses = {
    brand: 'text-brand-700',
    secondary: 'text-secondary-700',
    accent: 'text-accent-700',
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-surface-500">{title}</p>
      <p className={`mt-2 font-heading text-2xl font-bold ${valueClasses[color]}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-surface-400">{subtitle}</p>
    </div>
  );
}
