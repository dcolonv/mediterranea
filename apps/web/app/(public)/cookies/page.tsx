import Link from 'next/link';
import Image from 'next/image';
import { LanguageToggle } from '@/components/i18n/language-toggle';
import { getServerDictionary } from '@/lib/i18n/server';
import { getCookiePolicy } from '@/lib/legal/cookie-policy';

export const metadata = {
  title: 'Cookie Policy | Mediterránea Face Studio',
  description: 'How Mediterránea Face Studio uses cookies and similar technologies.',
};

export default async function CookiePolicyPage() {
  const { locale } = await getServerDictionary();
  const policy = getCookiePolicy(locale);

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-8 lg:px-8">
      {/* Standalone top bar — this page sits outside the /init header/footer. */}
      <div className="mx-auto mb-12 flex max-w-4xl items-center justify-between">
        <Link href="/" aria-label="Mediterránea Face Studio">
          <Image src="/logo_light.png" alt="Mediterránea Face Studio" width={110} height={50} priority />
        </Link>
        <LanguageToggle />
      </div>

      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{policy.title}</h1>
        <p className="mt-3 text-sm text-white-30">{policy.updated}</p>

        <div className="mt-8 space-y-4">
          {policy.intro.map((p) => (
            <p key={p} className="text-sm font-light leading-relaxed text-white-70">
              {p}
            </p>
          ))}
        </div>

        {policy.sections.map((section) => (
          <div key={section.heading} className="mt-12">
            <h2 className="font-serif text-2xl tracking-wide text-white">{section.heading}</h2>

            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-4 text-sm font-light leading-relaxed text-white-70">
                {p}
              </p>
            ))}

            {section.bullets && (
              <ul className="mt-4 space-y-2">
                {section.bullets.map((b) => (
                  <li key={b} className="border-l border-gold/30 pl-4 text-sm font-light text-white-50">
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {section.table && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                  <caption className="sr-only">{section.table.caption}</caption>
                  <thead>
                    <tr className="border-b border-white-10 text-[11px] uppercase tracking-wider text-gold">
                      <th scope="col" className="py-3 pr-4 font-semibold">{policy.columns.name}</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">{policy.columns.provider}</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">{policy.columns.purpose}</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">{policy.columns.duration}</th>
                      <th scope="col" className="py-3 font-semibold">{policy.columns.type}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row.name} className="border-b border-white-10 align-top">
                        <td className="py-4 pr-4 font-mono text-xs text-white">{row.name}</td>
                        <td className="py-4 pr-4 text-xs font-light text-white-50">{row.provider}</td>
                        <td className="py-4 pr-4 text-xs font-light leading-relaxed text-white-70">
                          {row.purpose}
                        </td>
                        <td className="py-4 pr-4 text-xs font-light text-white-50">{row.duration}</td>
                        <td className="py-4 text-xs font-light text-white-50">{row.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
