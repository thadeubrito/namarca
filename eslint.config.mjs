import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  globalIgnores(['**/.next/**', '**/node_modules/**', '**/drizzle/**', 'test-results/**', '**/dist/**', 'apps/admin/public/event-runtime/**']),
  { settings: { next: { rootDir: 'apps/admin/' } } },
  { rules: {
    '@next/next/no-img-element': 'off',
    // Auth changes intentionally reload the document to discard prefetched session state.
    '@next/next/no-location-assign-relative-destination': 'off',
  } },
]);
