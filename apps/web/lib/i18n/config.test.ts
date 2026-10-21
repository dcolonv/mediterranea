import { describe, it, expect } from 'vitest';
import { localizePath, splitLocalePath } from './config';

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
