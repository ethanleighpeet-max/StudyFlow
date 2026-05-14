import { currentUser } from '@clerk/nextjs/server';
import { DashboardContent } from './components/dashboard-content';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await currentUser();

  // Fetch stats server-side for initial render
  let stats = { todayMinutes: 0, todaySessions: 0, avgFocusRating: 0, streak: 0, weeklyMinutes: 0 };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/sessions/stats`, {
      headers: {
        Cookie: '',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) stats = data.data;
    }
  } catch {
    // Stats will default to zeros
  }

  return <DashboardContent firstName={user?.firstName ?? 'there'} initialStats={stats} />;
}
