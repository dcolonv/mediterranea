'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useLang } from '@/components/i18n/language-provider';
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/consent';

/**
 * GDPR / ePrivacy consent banner. Shown until the visitor accepts or rejects;
 * analytics stay off until "Accept" is chosen, and rejecting clears any GA
 * cookies from an earlier opt-in. Reopens via the footer "Cookie settings" link.
 */
export function CookieBanner() {
  const { dict } = useLang();
  const c = dict.cookies;
  // Start hidden: the choice lives in localStorage, which is client-only, so
  // rendering nothing on the server avoids a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
    // The footer link dispatches this to reopen the banner.
    const onReopen = () => setVisible(true);
    window.addEventListener('cookie-consent-reopen', onReopen);
    return () => window.removeEventListener('cookie-consent-reopen', onReopen);
  }, []);

  // Hide as soon as a choice is made anywhere in the app.
  useEffect(() => {
    const onChange = () => setVisible(false);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={c.title}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white-10 bg-dark-800 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="text-sm font-light leading-relaxed text-white-70">
          {c.body}{' '}
          <Link href="/cookies" className="text-gold underline underline-offset-2 hover:text-gold-light">
            {c.learnMore}
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={() => setConsent('rejected')}>
            {c.reject}
          </Button>
          <Button variant="elegant" size="sm" onClick={() => setConsent('accepted')}>
            {c.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner so a choice can be changed later. */
export function CookieSettingsLink() {
  const { dict } = useLang();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('cookie-consent-reopen'))}
      className="cursor-pointer text-sm text-white-50 transition-colors hover:text-white"
    >
      {dict.cookies.manage}
    </button>
  );
}
