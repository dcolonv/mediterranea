export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Best-effort E.164 normalization for SMS delivery. Defaults to Spain (+34).
 * Returns null when the input clearly isn't a usable number, so callers can skip
 * SMS rather than send to a bad address.
 *
 * - keeps an existing '+' country code
 * - converts a leading '00' international prefix to '+'
 * - otherwise assumes a national number and prepends the default country code
 */
export function normalizePhone(raw: string, defaultCountry: 'ES' = 'ES'): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : null;
  }
  if (s.startsWith('00')) {
    const digits = s.slice(2).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : null;
  }
  s = s.replace(/\D/g, '');
  if (s.length < 6) return null;
  const cc = defaultCountry === 'ES' ? '34' : '';
  // Drop a leading national trunk '0' before applying the country code.
  const national = s.replace(/^0+/, '');
  return `+${cc}${national}`;
}
