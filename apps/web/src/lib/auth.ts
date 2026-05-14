import { auth } from '@clerk/nextjs/server';
import { db, users } from '@studyflow/db';
import { eq } from 'drizzle-orm';

/**
 * Get the current authenticated user's database record.
 * Returns null if not authenticated or user not found in DB.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return user ?? null;
}
