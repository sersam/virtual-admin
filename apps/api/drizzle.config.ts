import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/infrastructure/database/schema.ts',
  strict: true,
  verbose: true,
});
