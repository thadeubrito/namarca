import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';

// Production must use the guarded runner, never this local CLI.
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  console.error('Use o runner de migrations de produção.');
  process.exitCode = 1;
} else {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? 'postgresql://namarca:namarca@db:5432/namarca' });
  let connectionFailed = false;
  client.on('error', () => { connectionFailed = true; });
  try {
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
    if (connectionFailed) throw new Error('Connection interrupted');
    console.log('Migrations locais concluídas.');
  } catch {
    console.error('Falha nas migrations locais. Verifique conexão e SQL sem expor credenciais.');
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => { process.exitCode = 1; });
  }
}
