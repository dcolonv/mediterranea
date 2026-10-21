import { describe, it, expect } from 'vitest';
import { isCrawler, localizePath, preferredLocale, splitLocalePath } from './config';

describe('localizePath', () => {
  it('prefixes localized pages for English', () => {
    expect(localizePath('/book', 'en')).toBe('/en/book');
    expect(localizePath('/treatments', 'en')).toBe('/en/treatments');
  });

  it('maps the home page to /en, without a trailing slash', () => {
    expect(localizePath('/', 'en')).toBe('/en');
  });

  it('keeps the query and the hash', () => {
    expect(localizePath('/book?group=custom', 'en')).toBe('/en/book?group=custom');
    expect(localizePath('/#about', 'en')).toBe('/en#about');
  });

  it('leaves Spanish links as they are', () => {
    expect(localizePath('/book?service=peeling', 'es')).toBe('/book?service=peeling');
  });

  it('prefixes treatment pages', () => {
    expect(localizePath('/treatments/peeling', 'en')).toBe('/en/treatments/peeling');
  });

  it('leaves pages without an English URL alone', () => {
    expect(localizePath('/account', 'en')).toBe('/account');
    expect(localizePath('/blog/a-post', 'en')).toBe('/blog/a-post');
  });
});

describe('splitLocalePath', () => {
  it('reads English from the /en prefix', () => {
    expect(splitLocalePath('/en')).toEqual({ path: '/', locale: 'en' });
    expect(splitLocalePath('/en/book')).toEqual({ path: '/book', locale: 'en' });
  });

  it('reads Spanish from an unprefixed localized page', () => {
    expect(splitLocalePath('/')).toEqual({ path: '/', locale: 'es' });
    expect(splitLocalePath('/gift-cards')).toEqual({ path: '/gift-cards', locale: 'es' });
  });

  it('reads the language of treatment pages', () => {
    expect(splitLocalePath('/treatments/peeling')).toEqual({ path: '/treatments/peeling', locale: 'es' });
    expect(splitLocalePath('/en/treatments/peeling')).toEqual({ path: '/treatments/peeling', locale: 'en' });
  });

  it('names no language for pages that follow the cookie', () => {
    expect(splitLocalePath('/account')).toEqual({ path: '/account', locale: null });
    // Not an /en path, despite the letters.
    expect(splitLocalePath('/english')).toEqual({ path: '/english', locale: null });
  });

  it('undoes localizePath', () => {
    for (const path of ['/', '/treatments', '/book', '/gift-cards', '/blog', '/treatments/peeling']) {
      expect(splitLocalePath(localizePath(path, 'en')).path).toBe(path);
    }
  });
});

describe('preferredLocale', () => {
  it('picks whichever of English and Spanish the browser ranks higher', () => {
    expect(preferredLocale('en-GB,en;q=0.9')).toBe('en');
    expect(preferredLocale('es-ES,es;q=0.9,en;q=0.8')).toBe('es');
    expect(preferredLocale('en-US,en;q=0.9,es;q=0.8')).toBe('en');
    expect(preferredLocale('es;q=0.5,en;q=0.7')).toBe('en');
  });

  it('looks past other languages to English or Spanish', () => {
    expect(preferredLocale('de-DE,de;q=0.9,en;q=0.8')).toBe('en');
    expect(preferredLocale('fr-FR,fr;q=0.9,es;q=0.8,en;q=0.7')).toBe('es');
  });

  it('keeps the browser’s order between equal weights', () => {
    expect(preferredLocale('es,en')).toBe('es');
    expect(preferredLocale('en,es')).toBe('en');
  });

  it('is null when the browser names neither, or sends nothing', () => {
    expect(preferredLocale('de-DE,de;q=0.9')).toBeNull();
    expect(preferredLocale('en;q=0')).toBeNull();
    expect(preferredLocale('')).toBeNull();
    expect(preferredLocale(null)).toBeNull();
  });
});

describe('isCrawler', () => {
  it('recognizes search engines and link previews', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
    expect(isCrawler('WhatsApp/2.23.20.0')).toBe(true);
    expect(isCrawler('facebookexternalhit/1.1')).toBe(true);
  });

  it('lets browsers through', () => {
    expect(
      isCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1')
    ).toBe(false);
    expect(isCrawler(null)).toBe(false);
  });
});
