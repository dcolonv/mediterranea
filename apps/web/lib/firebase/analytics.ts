import { app } from './config';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

/**
 * Lazily initialize Firebase Analytics (GA4) in the browser only.
 * Returns null when unsupported (SSR, no measurementId, or the environment
 * blocks it), so callers can safely no-op.
 */
let analyticsPromise: Promise<Analytics | null> | null = null;

export function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return Promise.resolve(null);
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
