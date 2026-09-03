/**
 * Cookie consent (GDPR / ePrivacy).
 *
 * Only two categories exist here:
 *  - Strictly necessary: the language preference and the auth session cookies.
 *    These are required for the site to work and are exempt from consent.
 *  - Analytics: Firebase Analytics (GA4). Never initialized without an explicit
 *    opt-in, and its cookies are cleared when consent is withdrawn.
 *
 * The choice itself is stored in localStorage (not a cookie), so nothing extra
 * is sent to the server, and it is only ever written after the user acts.
 */
export type ConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';
/** Fired on the window whenever the choice changes, so listeners can react. */
export const CONSENT_EVENT = 'cookie-consent-change';

export function getConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    // Storage can be blocked (private mode, strict settings) — treat as undecided.
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore — the banner will simply ask again next visit */
  }
  if (choice === 'rejected') clearAnalyticsCookies();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/**
 * Remove Google Analytics cookies (_ga, _ga_*, _gid…) left from a previous
 * opt-in, so withdrawing consent actually takes effect.
 */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  // Cover the exact host and the dot-prefixed parent domain GA writes to.
  const domains = [host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^_ga|^_gid$|^_gat/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}
