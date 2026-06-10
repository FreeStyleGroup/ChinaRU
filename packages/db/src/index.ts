import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const createPool = (url: string) => {
  return postgres(url, { max: 10 });
};

let db: ReturnType<typeof drizzle>;
let sql: ReturnType<typeof postgres>;

export function initDb(databaseUrl: string) {
  sql = createPool(databaseUrl);
  db = drizzle(sql, { schema });
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    if (!sql) throw new Error('Database pool not initialized');
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
  }
}

export * from './schema';
export type * from 'drizzle-orm';
