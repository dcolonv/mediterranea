import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { mintGiftCardFromSession } from '@/actions/gift-cards';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * Stripe webhook — the source of truth for completed payments. Verifies the
 * signature against STRIPE_WEBHOOK_SECRET, then reconciles events to Firestore
 * (currently: mint a gift card on a completed gift-card checkout).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid' && session.metadata?.type === 'gift_card') {
        await mintGiftCardFromSession({
          id: session.id,
          payment_intent:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          metadata: session.metadata,
        });
      }
    }
  } catch (err) {
    // Log but 200 so Stripe doesn't hammer retries for a non-signature issue;
    // reconciliation is idempotent and can be re-driven if needed.
    console.error('Stripe webhook handler error:', err);
  }

  return NextResponse.json({ received: true });
}
