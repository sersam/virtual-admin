import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPostgresPool } from './createPostgresPool.js';

const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));

export async function migrateDatabase(databaseUrl: string): Promise<void> {
  if (!databaseUrl.trim())
    throw new Error('DATABASE_URL es obligatoria para migrar la base de datos.');

  const pool = createPostgresPool({ connectionString: databaseUrl });

  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

export function getMigrationsFolder(): string {
  return migrationsFolder;
}
