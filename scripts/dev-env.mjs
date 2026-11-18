import { randomBytes } from 'node:crypto';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const target = new URL('.env.local', root);
const secret = () => randomBytes(32).toString('hex');
const password = secret();
const values = {
  POSTGRES_USER: 'namarca', POSTGRES_DB: 'namarca', POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://namarca:${password}@postgres:5432/namarca`,
  BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: secret(),
  ADMIN_EMAIL: 'admin@namarca.test', S3_ENDPOINT: 'http://s3:9000',
  S3_PUBLIC_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1',
  S3_BUCKET: 'namarca-local', S3_ACCESS_KEY_ID: secret(), S3_SECRET_ACCESS_KEY: secret(),
  S3_FORCE_PATH_STYLE: 'true', PIXGO_MODE: 'mock', PIXGO_BASE_URL: 'http://pixgo-mock:4010/api/v1',
  PIXGO_API_KEY: secret(), PIXGO_WEBHOOK_SECRET: secret(),
  PIXGO_WEBHOOK_URL: 'http://app:3000/api/webhooks/pixgo', PIXGO_MOCK_DEV_TOKEN: secret(),
};
// A repository-local exclusion protects generated secrets without editing .gitignore.
// The main project must also include .env* / !.env.example in its .gitignore.
try {
  await readFile(new URL('.git/HEAD', root));
  await mkdir(new URL('.git/info/', root), { recursive: true });
  const exclude = new URL('.git/info/exclude', root);
  const text = await readFile(exclude, 'utf8').catch(() => '');
  if (!text.split('\n').includes('/.env.local')) await writeFile(exclude, `${text}\n/.env.local\n`);
} catch (error) {
  if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
}
try {
  await writeFile(target, '# LOCAL DEVELOPMENT ONLY — generated, do not commit\n' + Object.entries(values).map(([k,v]) => `${k}=${v}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Created ${fileURLToPath(target)} (0600). Never commit this file.`);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env.local already exists; nothing changed.');
}
