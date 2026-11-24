import { NextRequest, NextResponse } from 'next/server';
import { createHostRoutingConfig, identifyHost, routeForHost } from './lib/host-routing';

export function proxy(request: NextRequest) {
  let site: ReturnType<typeof identifyHost>;
  try {
    const hosts = createHostRoutingConfig({
      NODE_ENV: process.env.NODE_ENV,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
    });
    // Next may normalize nextUrl to the container bind hostname. The original
    // Host is the routing input; forwarded-host is never trusted.
    const host = request.headers.get('host');
    site = identifyHost(host, host ?? '', hosts);
  } catch {
    // Missing/invalid production configuration must never expose the other site.
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const decision = routeForHost(site, request.nextUrl.pathname, request.method);
  if (decision.action === 'not-found') {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  // Strip client-supplied rewrite hints; this header is not an authorization signal.
  const headers = new Headers(request.headers);
  headers.delete('x-middleware-rewrite');
  headers.delete('x-middleware-subrequest');
  if (decision.action === 'rewrite') {
    const destination = request.nextUrl.clone();
    destination.pathname = decision.pathname;
    return NextResponse.rewrite(destination, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

// Host validation also covers static files; do not exclude _next or API paths.
export const config = { matcher: '/:path*' };
