'use server';

import { randomInt } from 'crypto';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { getStripe, stripeConfigured, toCents, siteUrl } from '@/lib/stripe/client';
import type { DocumentData } from 'firebase-admin/firestore';
import { formatPrice } from '@mediterranea/shared/utils';
import type { GiftCard, GiftCardStatus } from '@mediterranea/shared/types';

const COLLECTION = 'giftCards';
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 1000;

// Unambiguous alphabet (no 0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  const block = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `MED-${block()}-${block()}`;
}

async function uniqueCode(): Promise<string> {
  const db = getAdminDb();
  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    const existing = await db.collection(COLLECTION).where('code', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  // Extremely unlikely; append entropy.
  return `${randomCode()}${randomInt(9)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDTO(id: string, d: DocumentData): GiftCard {
  return { id, ...d } as GiftCard;
}

// ── Public: buy a gift card via Stripe Checkout ──────────────────────────────────

export interface GiftCardCheckoutInput {
  amount: number;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
}

export async function createGiftCardCheckout(
  input: GiftCardCheckoutInput
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false, error: 'Payments are not available right now. Please check back soon.' };
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return { success: false, error: `Amount must be between ${formatPrice(MIN_AMOUNT)} and ${formatPrice(MAX_AMOUNT)}.` };
  }
  if (!input.purchaserName?.trim() || !input.purchaserEmail?.trim()) {
    return { success: false, error: 'Please provide your name and email.' };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.purchaserEmail.trim(),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: toCents(amount),
            product_data: { name: `Mediterránea Face Studio gift card — ${formatPrice(amount)}` },
          },
        },
      ],
      metadata: {
        type: 'gift_card',
        amount: String(amount),
        purchaserName: input.purchaserName.trim().slice(0, 120),
        purchaserEmail: input.purchaserEmail.trim().slice(0, 200),
        recipientName: (input.recipientName ?? '').trim().slice(0, 120),
        recipientEmail: (input.recipientEmail ?? '').trim().slice(0, 200),
        message: (input.message ?? '').trim().slice(0, 300),
      },
      success_url: `${siteUrl()}/init/gift-cards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/init/gift-cards`,
    });
    if (!session.url) return { success: false, error: 'Could not start checkout. Please try again.' };
    return { success: true, url: session.url };
  } catch (error) {
    console.error('createGiftCardCheckout failed:', error);
    return { success: false, error: 'Could not start checkout. Please try again.' };
  }
}

/**
 * Mint a gift card from a completed Stripe Checkout session. Idempotent: a second
 * call for the same session returns the existing card. Called from the webhook.
 */
export async function mintGiftCardFromSession(session: {
  id: string;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
}): Promise<GiftCard | null> {
  const db = getAdminDb();
  const m = session.metadata ?? {};
  if (m.type !== 'gift_card') return null;

  // Idempotency: one card per checkout session.
  const dupe = await db.collection(COLLECTION).where('stripeSessionId', '==', session.id).limit(1).get();
  if (!dupe.empty) return toDTO(dupe.docs[0].id, dupe.docs[0].data());

  const amount = round2(Number(m.amount) || 0);
  if (amount <= 0) return null;

  const now = Timestamp.now();
  const code = await uniqueCode();
  const recipientEmail = m.recipientEmail || m.purchaserEmail;
  const recipientName = m.recipientName || m.purchaserName || 'there';

  const ref = await db.collection(COLLECTION).add({
    code,
    initialAmount: amount,
    balance: amount,
    status: 'active' as GiftCardStatus,
    purchaserName: m.purchaserName || '',
    purchaserEmail: m.purchaserEmail || '',
    recipientName: m.recipientName || '',
    recipientEmail: m.recipientEmail || '',
    message: m.message || '',
    source: 'online' as const,
    stripeSessionId: session.id,
    ...(session.payment_intent && { stripePaymentIntentId: session.payment_intent }),
    createdAt: now,
    updatedAt: now,
  });

  // Email the code (best-effort).
  try {
    const { sendEmail } = await import('@/lib/notifications/providers');
    const { giftCardIssued } = await import('@/lib/notifications/templates');
    const msg = giftCardIssued({ recipientName, code, amount: formatPrice(amount), message: m.message });
    if (recipientEmail) await sendEmail({ to: recipientEmail, subject: msg.subject, html: msg.html, text: msg.text });
  } catch (e) {
    console.error('gift card email failed:', e);
  }

  const doc = await ref.get();
  return toDTO(doc.id, doc.data()!);
}

// ── Admin ────────────────────────────────────────────────────────────────────────

export async function getGiftCards() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const cards = snap.docs
      .map((d) => toDTO(d.id, d.data()))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .map((c) => serializeDoc(c));
    return { success: true as const, data: cards };
  } catch (error) {
    console.error('getGiftCards failed:', error);
    return { success: false as const, error: 'Failed to load gift cards.' };
  }
}

export async function issueGiftCardManual(input: {
  amount: number;
  recipientName: string;
  recipientEmail: string;
  message?: string;
}) {
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    return { success: false as const, error: 'Enter a valid amount.' };
  }
  if (!input.recipientEmail?.trim()) {
    return { success: false as const, error: 'Recipient email is required.' };
  }
  try {
    const now = Timestamp.now();
    const code = await uniqueCode();
    await getAdminDb().collection(COLLECTION).add({
      code,
      initialAmount: amount,
      balance: amount,
      status: 'active' as GiftCardStatus,
      purchaserName: 'Studio',
      purchaserEmail: '',
      recipientName: input.recipientName.trim(),
      recipientEmail: input.recipientEmail.trim(),
      message: input.message?.trim() ?? '',
      source: 'manual' as const,
      createdAt: now,
      updatedAt: now,
    });
    try {
      const { sendEmail } = await import('@/lib/notifications/providers');
      const { giftCardIssued } = await import('@/lib/notifications/templates');
      const msg = giftCardIssued({
        recipientName: input.recipientName.trim() || 'there',
        code,
        amount: formatPrice(amount),
        message: input.message,
      });
      await sendEmail({ to: input.recipientEmail.trim(), subject: msg.subject, html: msg.html, text: msg.text });
    } catch (e) {
      console.error('gift card email failed:', e);
    }
    return { success: true as const, code };
  } catch (error) {
    console.error('issueGiftCardManual failed:', error);
    return { success: false as const, error: 'Failed to issue the gift card.' };
  }
}

/** Look up a card by code (for redemption). */
export async function lookupGiftCard(code: string) {
  try {
    const snap = await getAdminDb()
      .collection(COLLECTION)
      .where('code', '==', code.trim().toUpperCase())
      .limit(1)
      .get();
    if (snap.empty) return { success: false as const, error: 'No gift card found for that code.' };
    return { success: true as const, data: toDTO(snap.docs[0].id, snap.docs[0].data()) };
  } catch (error) {
    console.error('lookupGiftCard failed:', error);
    return { success: false as const, error: 'Lookup failed.' };
  }
}

/** Redeem (deduct) an amount from a card, transactionally. */
export async function redeemGiftCard(id: string, amount: number, note?: string) {
  const amt = round2(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    return { success: false as const, error: 'Enter a valid amount to redeem.' };
  }
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(id);
  try {
    const newBalance = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error('not-found');
      const card = doc.data() as GiftCard;
      if (card.status === 'void') throw new Error('void');
      if (amt > card.balance + 1e-9) throw new Error('insufficient');
      const balance = round2(card.balance - amt);
      tx.update(ref, {
        balance,
        status: balance <= 0 ? 'depleted' : 'active',
        redemptions: FieldValue.arrayUnion({ amount: amt, note: note ?? '', at: Timestamp.now() }),
        updatedAt: Timestamp.now(),
      });
      return balance;
    });
    return { success: true as const, balance: newBalance };
  } catch (e) {
    const msg =
      e instanceof Error && e.message === 'insufficient'
        ? 'That exceeds the remaining balance.'
        : e instanceof Error && e.message === 'void'
          ? 'This card has been voided.'
          : e instanceof Error && e.message === 'not-found'
            ? 'Gift card not found.'
            : 'Failed to redeem.';
    return { success: false as const, error: msg };
  }
}

export async function voidGiftCard(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({
      status: 'void' as GiftCardStatus,
      updatedAt: Timestamp.now(),
    });
    return { success: true as const };
  } catch (error) {
    console.error('voidGiftCard failed:', error);
    return { success: false as const, error: 'Failed to void the card.' };
  }
}

/** Whether online gift-card purchase is available (Stripe configured). */
export async function giftCardsAvailable(): Promise<boolean> {
  return stripeConfigured();
}
