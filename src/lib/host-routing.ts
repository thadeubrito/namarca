export type SiteHost = 'admin' | 'public';
export type HostRoutingConfig = { admin: string; public: string; development: boolean };
export type RoutingDecision = { action: 'next' } | { action: 'rewrite'; pathname: string } | { action: 'not-found' };

/** An exact authority, not a suffix match. Forwarded headers are intentionally unused. */
function authority(value: string): string | null {
  if (!value || value !== value.trim() || /[\s,/@\\?#%]/u.test(value)) return null;
  try {
    const url = new URL(`http://${value}`);
    if (url.username || url.password || url.pathname !== '/' || !url.hostname) return null;
    // URL parsing removes a default :80; preserve explicit ports for exact matching.
    return value.toLowerCase();
  } catch {
    return null;
  }
}

function originAuthority(value: string | undefined, production: boolean): string {
  if (!value) throw new Error('Both site origins must be configured in production');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:') ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash || !authority(url.host)) {
    throw new Error('Site origins must be bare HTTP(S) origins (HTTPS in production)');
  }
  return url.host.toLowerCase();
}

export function createHostRoutingConfig(env: {
  NODE_ENV?: string;
  BETTER_AUTH_URL?: string;
  PUBLIC_SITE_URL?: string;
}): HostRoutingConfig {
  const development = env.NODE_ENV !== 'production';
  const admin = originAuthority(env.BETTER_AUTH_URL ?? (development ? 'http://admin.localhost:3000' : undefined), !development);
  const publicHost = originAuthority(env.PUBLIC_SITE_URL ?? (development ? 'http://localhost:3000' : undefined), !development);
  if (admin === publicHost) throw new Error('Admin and public origins must have different hosts');
  if (development && (admin === 'localhost:3000' || admin === '127.0.0.1:3000' || publicHost === 'admin.localhost:3000')) {
    throw new Error('Development reserves localhost for public and admin.localhost for admin');
  }
  return { admin, public: publicHost, development };
}

export function identifyHost(hostHeader: string | null, nextUrlHost: string, config: HostRoutingConfig): SiteHost | null {
  const host = hostHeader ? authority(hostHeader) : null;
  if (!host || host !== authority(nextUrlHost)) return null;
  if (host === config.admin) return 'admin';
  if (host === config.public) return 'public';
  if (config.development) {
    if (host === 'admin.localhost:3000') return 'admin';
    if (host === 'localhost:3000' || host === '127.0.0.1:3000') return 'public';
  }
  return null;
}

const inside = (path: string, base: string) => path === base || path.startsWith(`${base}/`);
const administrativePages = ['/login', '/seguranca', '/campanhas', '/clientes', '/financeiro'];
const administrativeApis = ['/api/auth', '/api/campaigns', '/api/financial-report'];
const readMethod = (method: string) => method === 'GET' || method === 'HEAD';

/** Routing is not authorization: requireAdmin and Origin/CSRF checks remain mandatory. */
export function routeForHost(site: SiteHost | null, pathname: string, method: string): RoutingDecision {
  const reject: RoutingDecision = { action: 'not-found' };
  if (!site || !pathname.startsWith('/') || /[\\\u0000-\u0020]/u.test(pathname) || pathname.includes('//')) return reject;
  // Next emits percent-encoded brackets for dynamic route chunks. Permit only
  // those two escapes in its internal asset namespace, never encoded traversal.
  if (inside(pathname, '/_next')) {
    if (/%(?!5b|5d)/i.test(pathname) || pathname.split('/').some(part => part === '.' || part === '..')) return reject;
    return readMethod(method) ? { action: 'next' } : reject;
  }
  if (pathname.includes('%')) return reject;
  // Internal destinations must never be accepted from a browser on either host.
  if (inside(pathname, '/admin')) return reject;
  if (pathname === '/api/health') return readMethod(method) ? { action: 'next' } : reject;
  if (inside(pathname, '/api')) {
    if (site === 'admin' && administrativeApis.some((base) => inside(pathname, base))) return { action: 'next' };
    if (site === 'public' && pathname === '/api/webhooks/pixgo' && method === 'POST') return { action: 'next' };
    return reject;
  }
  if (pathname === '/admin-theme.js') return site === 'admin' && readMethod(method) ? { action: 'next' } : reject;
  if (inside(pathname, '/campaign-runtime')) return reject;
  if (site === 'admin') {
    if (pathname === '/' || administrativePages.some((base) => inside(pathname, base))) {
      return { action: 'rewrite', pathname: pathname === '/' ? '/admin' : `/admin${pathname}` };
    }
    // Shared browser metadata is harmless; the public landing/checkout/slug is not served here.
    if (['/favicon.ico', '/robots.txt'].includes(pathname) && readMethod(method)) return { action: 'next' };
    return reject;
  }
  if (administrativePages.some((base) => inside(pathname, base))) return reject;
  // Checkout server actions POST to their page, not to an unrestricted public API.
  if (!readMethod(method) && !(inside(pathname, '/checkout') && method === 'POST')) return reject;
  return { action: 'next' };
}
