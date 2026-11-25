import { defineConfig, globalIgnores } from './tools/lint/node_modules/eslint/lib/config-api.js';
import nextVitals from './tools/lint/node_modules/eslint-config-next/dist/core-web-vitals.js';
import nextTypescript from './tools/lint/node_modules/eslint-config-next/dist/typescript.js';
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  globalIgnores(['**/.next/**', '**/node_modules/**', '**/drizzle/**', 'test-results/**', '**/dist/**', 'public/campaigns/**']),
  { settings: { next: { rootDir: './' } } },
  { rules: {
    '@next/next/no-img-element': 'off',
    // Auth changes intentionally reload the document to discard prefetched session state.
    '@next/next/no-location-assign-relative-destination': 'off',
  } },
]);
