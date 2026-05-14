import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy-initialize the database connection so it doesn't throw at build time
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(queryClient, { schema });
  return _db;
}

// Proxy that lazily connects on first use (safe during build)
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

// Export type for use in other packages
export type Database = PostgresJsDatabase<typeof schema>;
