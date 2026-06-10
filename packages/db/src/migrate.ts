import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Running migrations...');
    await migrate(sql, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
