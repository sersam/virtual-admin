import { getMigrationsFolder, migrateDatabase } from './migrateDatabase.js';

export async function migrateSessionsDatabase(databaseUrl: string): Promise<void> {
  await migrateDatabase(databaseUrl);
}

export function getSessionsMigrationsFolder(): string {
  return getMigrationsFolder();
}
