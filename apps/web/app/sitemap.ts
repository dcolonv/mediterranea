import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/actions/blog';
import { getBookingServices } from '@/actions/public-booking';
import { TREATMENT_PAGES } from '@/lib/booking/treatment-pages';
import { LOCALIZED_PATHS, localizePath } from '@/lib/i18n/config';
import { absoluteUrl } from '@/lib/seo';

// Lists the published blog posts and active treatments (Admin SDK) — on
// demand, not at build time.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, services] = await Promise.all([getPublishedPosts(), getBookingServices()]);
  // A treatment page with no active service is a 404 — say, a seasonal facial
  // out of season — so it's left out until its treatment is back.
  const active = new Set(services.map((s) => s.slug));
  const treatmentPaths = TREATMENT_PAGES.filter((p) => p.services.some((s) => active.has(s))).map(
    (p) => `/treatments/${p.slug}`
  );
  // Both language versions of each localized page, each naming the other.
  const paths = [...LOCALIZED_PATHS, ...treatmentPaths];
  const pages = paths.flatMap((path) => {
    const languages = { es: absoluteUrl(path), en: absoluteUrl(localizePath(path, 'en')) };
    return [languages.es, languages.en].map((url) => ({ url, alternates: { languages } }));
  });
  return [
    ...pages,
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      ...(post.publishedAt && { lastModified: post.publishedAt }),
    })),
  ];
}
