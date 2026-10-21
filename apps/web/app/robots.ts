import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Staff and client-only areas, and appointment links that carry a token.
      disallow: ['/api/', '/backoffice', '/login', '/account', '/manage'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
