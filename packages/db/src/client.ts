import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Schema = typeof schema;

/** Единый тип БД, на который типизированы репозитории (prod-драйвер postgres.js). */
export type Database = PostgresJsDatabase<Schema>;

export interface DbHandle {
  db: Database;
  close: () => Promise<void>;
}

/** Создаёт пул подключений к PostgreSQL (postgres.js) и Drizzle поверх него. */
export function createDb(connectionString: string, max = 10): DbHandle {
  const client = postgres(connectionString, { max });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}
