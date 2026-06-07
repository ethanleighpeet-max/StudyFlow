import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { SocialView } from './components/social-view';

export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  const user = await getCurrentUser();

  return (
    <Suspense fallback={null}>
      <SocialView currentUserId={user?.id ?? ''} />
    </Suspense>
  );
}
