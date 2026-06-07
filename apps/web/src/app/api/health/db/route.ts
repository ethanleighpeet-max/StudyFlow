import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, users } from '@studyflow/db';

export const dynamic = 'force-dynamic';

/**
 * Unauthenticated database health check.
 * Lets us verify DATABASE_URL works in the deployed environment
 * without needing a signed-in Clerk session.
 * Exposes no user data — only a row count.
 */
export async function GET() {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    return NextResponse.json({
      success: true,
      data: { db: 'up', users: row?.count ?? 0 },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
