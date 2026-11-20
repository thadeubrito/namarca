export function pixRemainingSeconds(expiresAt: string, now: number): number | null {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : null;
}

export function formatPixCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours ? `${hours}:` : ''}${String(hours ? minutes : Math.floor(seconds / 60)).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
