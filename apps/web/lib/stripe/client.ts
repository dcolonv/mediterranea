/**
 * Server-side Stripe client. Lazy + dormant-safe: when STRIPE_SECRET_KEY is
 * unset, `getStripe()` returns null so commerce features degrade to a clear
 * "not configured" message instead of crashing.
 */
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cached;
}

/** Euros (as used across the app) → integer cents for Stripe amounts. */
export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Base URL for building Stripe success/cancel redirect URLs. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  );
}
