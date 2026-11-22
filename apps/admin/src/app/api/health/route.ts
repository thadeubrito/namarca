import { pool } from "../../../db";
import { checkStorageReady } from "../../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const [database, storage] = await Promise.allSettled([
    pool.query("SELECT 1"),
    checkStorageReady(),
  ]);
  const checks = { database: database.status === "fulfilled" ? "ok" : "unavailable", storage: storage.status === "fulfilled" ? "ok" : "unavailable" };
  const healthy = Object.values(checks).every((value) => value === "ok");
  // Deliberately public: no URLs, bucket names, versions, exception messages or credentials.
  return Response.json({ status: healthy ? "ok" : "unavailable", checks }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
