import { migrateDatabase } from './migrateDatabase.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria para ejecutar las migraciones PostgreSQL.');
}

await migrateDatabase(databaseUrl);
console.warn('Migraciones PostgreSQL aplicadas correctamente.');
