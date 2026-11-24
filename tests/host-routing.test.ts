import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHostRoutingConfig, identifyHost, routeForHost } from '../src/lib/host-routing';

const production = createHostRoutingConfig({
  NODE_ENV: 'production',
  BETTER_AUTH_URL: 'https://admin.namarca.com',
  PUBLIC_SITE_URL: 'https://namarca.com',
});
const next = { action: 'next' };
const denied = { action: 'not-found' };

test('production requires explicit, distinct, bare HTTPS origins', () => {
  assert.throws(() => createHostRoutingConfig({ NODE_ENV: 'production' }));
  for (const origin of ['http://admin.namarca.com', 'https://user:pass@admin.namarca.com', 'https://admin.namarca.com/login', 'https://admin.namarca.com?x=1']) {
    assert.throws(() => createHostRoutingConfig({ NODE_ENV: 'production', BETTER_AUTH_URL: origin, PUBLIC_SITE_URL: 'https://namarca.com' }));
  }
  assert.throws(() => createHostRoutingConfig({ NODE_ENV: 'production', BETTER_AUTH_URL: 'https://namarca.com', PUBLIC_SITE_URL: 'https://namarca.com' }));
});

test('exact Host and nextUrl agreement, without forwarded host trust', () => {
  assert.equal(identifyHost('admin.namarca.com', 'admin.namarca.com', production), 'admin');
  assert.equal(identifyHost('NAMARCA.COM', 'namarca.com', production), 'public');
  for (const host of [null, 'evil.test', 'admin.namarca.com.evil.test', 'admin.namarca.com,evil.test', 'admin.namarca.com:443', 'admin.namarca.com.', ' admin.namarca.com', 'admin.namarca.com/path', 'user@admin.namarca.com', 'admin.namarca.com\\evil.test', 'admin.namarca.com%00']) {
    assert.equal(identifyHost(host, host ?? 'admin.namarca.com', production), null, String(host));
  }
  assert.equal(identifyHost('namarca.com', 'admin.namarca.com', production), null);
  assert.equal(identifyHost('localhost:3000', 'localhost:3000', production), null);
});

test('development localhost is public, admin.localhost is administrative', () => {
  const dev = createHostRoutingConfig({ NODE_ENV: 'development' });
  assert.equal(identifyHost('localhost:3000', 'localhost:3000', dev), 'public');
  assert.equal(identifyHost('127.0.0.1:3000', '127.0.0.1:3000', dev), 'public');
  assert.equal(identifyHost('admin.localhost:3000', 'admin.localhost:3000', dev), 'admin');
  assert.equal(identifyHost('localhost:3001', 'localhost:3001', dev), null);
  assert.throws(() => createHostRoutingConfig({ NODE_ENV: 'development', BETTER_AUTH_URL: 'http://localhost:3000' }));
});

test('administrative pages rewrite without moving APIs; internal paths never enter directly', () => {
  for (const path of ['/', '/login', '/seguranca', '/campanhas', '/campanhas/123', '/clientes/novo', '/financeiro']) {
    assert.deepEqual(routeForHost('admin', path, 'GET'), { action: 'rewrite', pathname: path === '/' ? '/admin' : `/admin${path}` });
    assert.deepEqual(routeForHost('admin', path, 'POST'), { action: 'rewrite', pathname: path === '/' ? '/admin' : `/admin${path}` });
    if (path !== '/') assert.deepEqual(routeForHost('public', path, 'GET'), denied);
  }
  for (const site of ['admin', 'public'] as const) {
    assert.deepEqual(routeForHost(site, '/admin', 'GET'), denied);
    assert.deepEqual(routeForHost(site, '/admin/login', 'POST'), denied);
  }
  for (const path of ['/api/auth/sign-in/email', '/api/auth/form-unavailable', '/api/campaigns/id/editor', '/api/financial-report']) {
    assert.deepEqual(routeForHost('admin', path, 'POST'), next);
    assert.deepEqual(routeForHost('public', path, 'GET'), denied);
    assert.deepEqual(routeForHost('public', path, 'POST'), denied);
  }
});

test('public campaign reader and checkout remain public, API allow-list is closed', () => {
  for (const path of ['/', '/clube-sol', '/campaigns/clube-sol/campaign.json', '/checkout/synthetic']) {
    assert.deepEqual(routeForHost('public', path, 'GET'), next);
    assert.deepEqual(routeForHost('admin', path, 'GET'), path === '/' ? { action: 'rewrite', pathname: '/admin' } : denied);
  }
  assert.deepEqual(routeForHost('public', '/checkout/synthetic', 'POST'), next);
  for (const path of ['/', '/clube-sol', '/campaigns/clube-sol/campaign.json']) assert.deepEqual(routeForHost('public', path, 'POST'), denied);
  assert.deepEqual(routeForHost('public', '/api/webhooks/pixgo', 'POST'), next);
  assert.deepEqual(routeForHost('public', '/api/webhooks/pixgo', 'GET'), denied);
  assert.deepEqual(routeForHost('admin', '/api/webhooks/pixgo', 'POST'), denied);
  for (const site of ['admin', 'public'] as const) {
    assert.deepEqual(routeForHost(site, '/api/health', 'GET'), next);
    assert.deepEqual(routeForHost(site, '/api/health', 'POST'), denied);
    for (const path of ['/api/unknown', '/api/authentication', '/api/webhooks/pixgo/extra']) assert.deepEqual(routeForHost(site, path, 'POST'), denied);
  }
});

test('Next assets are shared but retired runtime paths and malformed requests fail closed', () => {
  for (const site of ['admin', 'public'] as const) {
    assert.deepEqual(routeForHost(site, '/_next/static/chunk.js', 'GET'), next);
    assert.deepEqual(routeForHost(site, '/_next/static/chunk.js', 'POST'), denied);
    for (const path of ['/campaign-runtime/main.js', '/campaign-runtime/preview.js', '/campaign-runtime/preview.html', '/campaign-runtime/index.html']) {
      assert.deepEqual(routeForHost(site, path, 'GET'), denied);
      assert.deepEqual(routeForHost(site, path, 'POST'), denied);
    }
    assert.deepEqual(routeForHost(site, '/admin-theme.js', 'GET'), site === 'admin' ? next : denied);
    for (const path of ['/admin%2flogin', '//admin/login', '/foo\\bar', '/login%00']) assert.deepEqual(routeForHost(site, path, 'GET'), denied);
  }
  assert.deepEqual(routeForHost(null, '/_next/static/chunk.js', 'GET'), denied);
});

test('chunks de rotas dinâmicas permitem somente colchetes codificados no namespace Next', () => {
  assert.deepEqual(routeForHost('public', '/_next/static/chunks/app/%5Bslug%5D/page.js', 'GET'), { action: 'next' });
  for (const path of ['/_next/%2e%2e/private', '/_next/%2fapi', '/_next/../private']) {
    assert.deepEqual(routeForHost('public', path, 'GET'), { action: 'not-found' });
  }
  assert.deepEqual(routeForHost('public', '/_next/static/chunks/app/%5Bslug%5D/page.js', 'POST'), { action: 'not-found' });
});
