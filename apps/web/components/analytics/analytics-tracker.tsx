'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsInstance, logPageView } from '@/lib/firebase/analytics';
import { CONSENT_EVENT } from '@/lib/consent';

/**
 * Initializes Firebase Analytics and logs a page_view on every client-side
 * route change. Analytics only starts once the visitor accepts cookies — the
 * init call is a no-op otherwise — and starts immediately if they accept
 * mid-session. The first load is skipped here because GA auto-tracks it on
 * init, avoiding a duplicate. Renders nothing.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    // No-ops until consent is given.
    void getAnalyticsInstance();

    // Accepting later should start tracking without a page reload.
    const onConsentChange = () => void getAnalyticsInstance();
    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void logPageView(pathname);
  }, [pathname]);

  return null;
}
