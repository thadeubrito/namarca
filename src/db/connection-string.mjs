// Keep pg's certificate and hostname verification strict across driver upgrades.
// Never include a connection string in errors or logs.
export function strictDatabaseConnectionString(value) {
  if (!value) return value;
  let url;
  try { url = new URL(value); }
  catch { throw new Error('Invalid database connection configuration.'); }
  const modes = url.searchParams.getAll('sslmode');
  if (modes.length > 1) throw new Error('Duplicate database SSL mode.');
  const mode = modes[0];
  if (['prefer', 'require', 'verify-ca'].includes(mode)) {
    if (url.searchParams.has('uselibpqcompat')) {
      throw new Error('Explicit libpq SSL compatibility is not supported; use verify-full.');
    }
    url.searchParams.set('sslmode', 'verify-full');
    return url.toString();
  }
  return value;
}
