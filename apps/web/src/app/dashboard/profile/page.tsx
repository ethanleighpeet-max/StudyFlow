import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileView } from './components/profile-view';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <ProfileView
      name={user.name}
      email={user.email}
      avatarUrl={user.avatarUrl}
      memberSince={user.createdAt.toISOString()}
      premiumTier={user.premiumTier}
    />
  );
}
