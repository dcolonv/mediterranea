import { app } from './config';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { getConsent } from '@/lib/consent';

/**
 * Lazily initialize Firebase Analytics (GA4) in the browser only, and only
 * once the visitor has accepted analytics cookies (GDPR / ePrivacy). Returns
 * null when consent is missing or declined, when there is no measurementId, or
 * when the environment doesn't support it — so callers can safely no-op.
 */
let analyticsPromise: Promise<Analytics | null> | null = null;

export function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return Promise.resolve(null);
  // No consent, no analytics — and nothing is cached, so a later opt-in works.
  if (getConsent() !== 'accepted') return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}

/** Log a page_view for SPA route changes (initial load is auto-tracked by GA). */
export async function logPageView(path: string): Promise<void> {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
