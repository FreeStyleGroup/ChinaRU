import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/china_ru',
  },
  migrations: {
    migrationsFolder: './drizzle',
  },
} satisfies Config;
