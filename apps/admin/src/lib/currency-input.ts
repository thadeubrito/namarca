// Digits represent cents, matching a BRL currency input. Empty stays empty.
export function maskBRL(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integer},${padded.slice(-2)}`;
}

// Existing defaults/drafts use decimal reais, not a string of cents.
export function displayBRL(value: string): string {
  if (!value.trim()) return '';
  const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return '';
  return maskBRL(String(Math.round(Number(normalized) * 100)));
}
