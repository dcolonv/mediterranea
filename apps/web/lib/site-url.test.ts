import { describe, it, expect, afterEach } from 'vitest';
import { siteUrl } from './site-url';

const VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_BASE_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
] as const;

function clear() {
  for (const v of VARS) delete process.env[v];
}

afterEach(clear);

describe('siteUrl', () => {
  it('prefers the explicit variable', () => {
    clear();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.mediterraneafacestudio.com';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'ignored.vercel.app';
    expect(siteUrl()).toBe('https://www.mediterraneafacestudio.com');
  });

  it('falls back to NEXT_PUBLIC_BASE_URL', () => {
    clear();
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
    expect(siteUrl()).toBe('https://example.com');
  });

  it('uses the Vercel production domain when no explicit variable is set', () => {
    clear();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'mediterranea.vercel.app';
    process.env.VERCEL_URL = 'deploy-abc123.vercel.app';
    // The stable production domain wins over the per-deployment URL.
    expect(siteUrl()).toBe('https://mediterranea.vercel.app');
  });

  it('falls back to the per-deployment URL as a last resort', () => {
    clear();
    process.env.VERCEL_URL = 'deploy-abc123.vercel.app';
    expect(siteUrl()).toBe('https://deploy-abc123.vercel.app');
  });

  it('adds a scheme to a bare host and strips a trailing slash', () => {
    clear();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
    expect(siteUrl()).toBe('https://example.com');
    process.env.NEXT_PUBLIC_SITE_URL = 'example.com';
    expect(siteUrl()).toBe('https://example.com');
  });

  it('only reaches localhost when nothing at all is configured', () => {
    clear();
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
