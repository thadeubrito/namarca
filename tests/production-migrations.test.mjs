import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrateProduction } from "../scripts/migrate-production.mjs";

const production = { VERCEL: "1", VERCEL_ENV: "production", DATABASE_URL: "postgresql://test:test@db/test" };
function harness({ acquired = true, fail = false, socketError = false } = {}) {
  const calls = [];
  let onError;
  return {
    calls,
    options: {
      env: production,
      log() {},
      createClient(options) {
        calls.push(["client", options.connectionString]);
        return {
          on(event, handler) { assert.equal(event, "error"); onError = handler; },
          async connect() { calls.push("connect"); },
          async query(sql) { calls.push(sql); return { rows: [{ acquired }] }; },
          async end() { calls.push("end"); },
        };
      },
      async applyMigrations() {
        calls.push("migrate");
        if (socketError) onError(new Error("synthetic-sensitive-marker"));
        if (fail) throw new Error("synthetic failure");
      },
    },
  };
}

test("preview, development and local builds never connect", async () => {
  for (const env of [{}, { ...production, VERCEL_ENV: "preview" }, { ...production, VERCEL_ENV: "development" }, { ...production, VERCEL: "0" }]) {
    const h = harness();
    await migrateProduction({ ...h.options, env });
    assert.deepEqual(h.calls, []);
  }
});
test("production requires an explicit connection and rejects Neon pooler", async () => {
  for (const env of [{ VERCEL: "1", VERCEL_ENV: "production" }, { ...production, DATABASE_URL: "postgresql://test:test@ep-test-pooler.neon.tech/db" }]) {
    const h = harness();
    await assert.rejects(migrateProduction({ ...h.options, env }));
    assert.deepEqual(h.calls, []);
  }
});
test("direct migration URL takes precedence; lock surrounds migrations", async () => {
  const h = harness();
  await migrateProduction({ ...h.options, env: { ...production, MIGRATION_DATABASE_URL: "postgresql://test:test@direct/test" } });
  assert.deepEqual(h.calls, [
    ["client", "postgresql://test:test@direct/test"], "connect",
    "SELECT pg_try_advisory_lock($1::bigint) AS acquired", "migrate",
    "SELECT pg_advisory_unlock($1::bigint)", "end",
  ]);
});
test("concurrent migration fails closed and closes connection", async () => {
  const h = harness({ acquired: false });
  await assert.rejects(migrateProduction(h.options));
  assert.equal(h.calls.includes("migrate"), false);
  assert.equal(h.calls.at(-1), "end");
});
test("SQL failure propagates, unlocks and closes connection", async () => {
  const h = harness({ fail: true });
  await assert.rejects(migrateProduction(h.options), /synthetic failure/);
  assert.deepEqual(h.calls.slice(-2), ["SELECT pg_advisory_unlock($1::bigint)", "end"]);
});
test("asynchronous socket errors fail closed without echoing their payload", async () => {
  const h = harness({ socketError: true });
  await assert.rejects(migrateProduction(h.options), (error) => {
    assert.equal(error.message, "Conexão de migration interrompida.");
    assert.equal(error.message.includes("synthetic-sensitive-marker"), false);
    return true;
  });
  assert.equal(h.calls.at(-1), "end");
});
test("Vercel runs migrations before build, ordinary builds remain isolated", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  assert.equal(vercel.buildCommand, "env -u npm_config_cache_dir -u NPM_CONFIG_CACHE_DIR NEXT_TELEMETRY_DISABLED=1 npm run vercel-build");
  assert.equal(vercel.installCommand, "sh scripts/vercel-install.sh");
  assert.equal(pkg.scripts["vercel-build"], "node scripts/migrate-production.mjs && npm run build");
  assert.equal(pkg.scripts.build, "next build");
});
