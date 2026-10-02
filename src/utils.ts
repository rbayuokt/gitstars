// GitHub logins: 1-39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.
const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

export function parseLimit(value: string | null, fallback = 10): number {
  if (value === null || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.trunc(n)));
}

// 1 decimal under 100, whole numbers above, never a trailing ".0"
function compact(n: number): string {
  return n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  // 999_500+ would round to "1000k"
  if (n < 999_500) return `${compact(n / 1000)}k`;
  return `${compact(n / 1_000_000)}M`;
}

export function formatFull(n: number): string {
  return n.toLocaleString('en-US');
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length <= max ? value : `${chars.slice(0, max - 1).join('')}…`;
}
