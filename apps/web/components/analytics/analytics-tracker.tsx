'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsInstance, logPageView } from '@/lib/firebase/analytics';

/**
 * Initializes Firebase Analytics and logs a page_view on every client-side
 * route change. The first load is skipped here because GA auto-tracks it on
 * init, avoiding a duplicate. Renders nothing.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    // Ensure analytics is initialized on first mount (auto-logs initial view).
    void getAnalyticsInstance();
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
