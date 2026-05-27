import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';

/**
 * Get the current authenticated user's database record.
 * If the user is authenticated via Clerk but doesn't exist in the DB yet
 * (e.g. webhook hasn't fired), creates the record on-the-fly.
 * Returns null only if not authenticated.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing) {
    return existing;
  }

  // User authenticated via Clerk but not in DB — create them now
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  const [created] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User',
      avatarUrl: clerkUser.imageUrl ?? null,
    })
    .onConflictDoNothing()
    .returning();

  return created ?? null;
}
