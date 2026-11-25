import { pathToFileURL, fileURLToPath } from "node:url";
import pg from "pg";
import { strictDatabaseConnectionString } from "../src/db/connection-string.mjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Session lock: every deployment must use this same database and lock key.
const LOCK_KEY = "723610184920174";
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function migrateProduction({
  env = process.env,
  createClient = (options) => new pg.Client(options),
  applyMigrations = (client) => migrate(drizzle(client), { migrationsFolder }),
  log = console.log,
} = {}) {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "production") {
    log("Migrations ignoradas: execução fora da produção Vercel.");
    return;
  }

  // Deliberately no local/default connection fallback in production.
  const connectionString = strictDatabaseConnectionString(env.MIGRATION_DATABASE_URL || env.DATABASE_URL);
  if (!connectionString) throw new Error("Conexão de migration não configurada.");
  // Neon transaction pooling cannot preserve the session advisory lock.
  if (new URL(connectionString).hostname.includes("-pooler.")) {
    throw new Error("Migrations exigem a conexão direta do Neon, sem pooler.");
  }

  const client = createClient({
    connectionString,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    application_name: "namarca-production-migrations",
  });
  let locked = false;
  let connectionFailed = false;
  // pg can emit socket errors outside query promises. Never print that payload.
  client.on("error", () => { connectionFailed = true; });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
      [LOCK_KEY],
    );
    locked = result.rows[0]?.acquired === true;
    if (!locked) throw new Error("Migration concorrente em execução.");
    log("Aplicando migrations versionadas pendentes.");
    await applyMigrations(client);
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock($1::bigint)", [LOCK_KEY]);
    } finally {
      await client.end();
    }
  }
  if (connectionFailed) throw new Error("Conexão de migration interrompida.");
  log("Migrations concluídas.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateProduction().catch(() => {
    // Database errors may contain connection details or sensitive SQL data.
    console.error("Migrations de produção falharam; deploy interrompido. Verifique conexão, concorrência e SQL das migrations sem expor credenciais.");
    process.exitCode = 1;
  });
}
