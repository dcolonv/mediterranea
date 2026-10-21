import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/actions/blog';
import { TREATMENT_PAGES } from '@/lib/booking/treatment-pages';
import { LOCALIZED_PATHS, localizePath } from '@/lib/i18n/config';
import { absoluteUrl } from '@/lib/seo';

// Lists the published blog posts (Admin SDK) — on demand, not at build time.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  // Both language versions of each localized page, each naming the other.
  const paths = [...LOCALIZED_PATHS, ...TREATMENT_PAGES.map((p) => `/treatments/${p.slug}`)];
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
