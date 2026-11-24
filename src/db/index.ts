import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { namarcaPool?: Pool };
export const pool = globalDb.namarcaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 30000,
  query_timeout: 3000,
  statement_timeout: 3000,
});
if (process.env.NODE_ENV !== "production") globalDb.namarcaPool = pool;
export const db = drizzle(pool, { schema });
