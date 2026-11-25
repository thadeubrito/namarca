import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'node:url';

// Drizzle Kit expects relative output paths in its snapshot reader.
process.chdir(fileURLToPath(new URL('../../', import.meta.url)));

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://namarca:namarca@db:5432/namarca' },
  strict: true,
  verbose: true,
});
