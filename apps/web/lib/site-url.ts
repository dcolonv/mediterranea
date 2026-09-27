/**
 * The site's own absolute base URL, for links that leave the app — Stripe
 * redirect URLs and the manage links in appointment emails.
 *
 * This used to fall back straight to localhost, which is silent and wrong in
 * production: gift-card buyers were redirected to http://localhost:3000 after
 * paying, and confirmation emails carried localhost links. The Vercel-provided
 * domain is now used before that fallback, so a deploy is usable even when the
 * explicit variable is missing.
 *
 * Server-only: it reads VERCEL_* variables, which are not exposed to the
 * browser.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return normalize(explicit);

  // Vercel sets these automatically. The project production URL is stable
  // across deploys; VERCEL_URL is per-deployment and only a last resort.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return normalize(vercel);

  if (process.env.NODE_ENV === 'production') {
    // Loud, because every link built from this will be wrong.
    console.error(
      '[site-url] No NEXT_PUBLIC_SITE_URL and no Vercel URL in production — ' +
        'falling back to localhost. Payment redirects and email links will be broken.'
    );
  }
  return 'http://localhost:3000';
}

/** Add a scheme if missing (Vercel gives a bare host) and drop any trailing slash. */
function normalize(value: string): string {
  const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, '');
}
