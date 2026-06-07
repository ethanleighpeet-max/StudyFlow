import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UpgradeView } from './components/upgrade-view';

export default async function UpgradePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <UpgradeView initialTier={user.premiumTier} />;
}
