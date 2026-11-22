import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  transpilePackages: ['@namarca/editor'],
  poweredByHeader: false,
  allowedDevOrigins: ['localhost', '127.0.0.1', 'app', 'namarca-editor-test'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/event-runtime/:path*', headers: [
      { key: 'Cache-Control', value: 'no-cache' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ] }, { source: '/checkout/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ] }];
  },
};
export default config;
