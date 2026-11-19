// Container-only launcher; preserves credentials without printing them.
import { spawnSync } from 'node:child_process';
const database = new URL(process.env.DATABASE_URL);
database.pathname = '/namarca_editor_test';
const result = spawnSync('node_modules/.bin/tsx', ['scripts/test-campaign-editor.ts'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: database.href, BETTER_AUTH_URL: 'http://namarca-editor-test:3000', ADMIN_EMAIL: 'editor-test@namarca.test' },
});
process.exit(result.status ?? 1);
