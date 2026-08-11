'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { normalizePhone } from '@mediterranea/shared/utils';
import type {
  Campaign,
  CampaignChannel,
  CampaignSegment,
  Customer,
} from '@mediterranea/shared/types';

const COLLECTION = 'campaigns';

export interface CampaignInput {
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  segmentValue?: string;
  subject: string;
  body: string;
}

/** Today's date (YYYY-MM-DD) in the studio timezone. */
function todayMalaga(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

/** Resolve the recipients (by channel) for a segment. */
async function resolveRecipients(
  channel: CampaignChannel,
  segment: CampaignSegment,
  value: string | undefined
): Promise<{ name: string; to: string }[]> {
  const snap = await getAdminDb().collection('customers').get();
  const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
  const today = todayMalaga();

  const matches = customers.filter((c) => {
    if (segment === 'marketing' && !c.consent?.marketingOptIn) return false;
    if (segment === 'tag' && !(c.tags ?? []).includes(value ?? '')) return false;
    if (segment === 'inactive') {
      const days = Number(value) || 90;
      if (c.lastVisitDate && daysBetween(c.lastVisitDate, today) < days) return false;
    }
    return true;
  });

  const seen = new Set<string>();
  const recipients: { name: string; to: string }[] = [];
  for (const c of matches) {
    const to = channel === 'email' ? c.email : normalizePhone(c.phone) ?? '';
    if (!to || seen.has(to)) continue;
    seen.add(to);
    recipients.push({ name: c.name?.split(' ')[0] || 'there', to });
  }
  return recipients;
}

export async function estimateAudience(
  channel: CampaignChannel,
  segment: CampaignSegment,
  value?: string
) {
  try {
    const recipients = await resolveRecipients(channel, segment, value);
    return { success: true as const, count: recipients.length };
  } catch (error) {
    console.error('estimateAudience failed:', error);
    return { success: false as const, error: 'Could not estimate audience.' };
  }
}

export async function getCampaigns() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Campaign)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    return { success: true as const, data: items };
  } catch (error) {
    console.error('getCampaigns failed:', error);
    return { success: false as const, error: 'Failed to load campaigns.' };
  }
}

export async function createCampaign(input: CampaignInput) {
  if (!input.name?.trim() || !input.body?.trim()) {
    return { success: false as const, error: 'Name and message are required.' };
  }
  if (input.channel === 'email' && !input.subject?.trim()) {
    return { success: false as const, error: 'Email campaigns need a subject.' };
  }
  try {
    const ref = await getAdminDb().collection(COLLECTION).add({
      name: input.name.trim(),
      channel: input.channel,
      segment: input.segment,
      segmentValue: input.segmentValue ?? '',
      subject: input.subject?.trim() ?? '',
      body: input.body.trim(),
      status: 'draft',
      createdAt: Timestamp.now(),
      sentAt: null,
    });
    return { success: true as const, id: ref.id };
  } catch (error) {
    console.error('createCampaign failed:', error);
    return { success: false as const, error: 'Failed to create the campaign.' };
  }
}

/** Send a draft campaign to its resolved audience (best-effort). */
export async function sendCampaign(id: string) {
  const db = getAdminDb();
  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return { success: false as const, error: 'Campaign not found.' };
    const c = doc.data() as Campaign;
    if (c.status === 'sent') return { success: false as const, error: 'Already sent.' };

    const recipients = await resolveRecipients(c.channel, c.segment, c.segmentValue);
    if (recipients.length === 0) {
      return { success: false as const, error: 'No recipients match this segment.' };
    }

    const { sendEmail, sendSms } = await import('@/lib/notifications/providers');
    let sent = 0;
    const results = await Promise.allSettled(
      recipients.map(async (r) => {
        const body = c.body.replace(/\{name\}/gi, r.name);
        const res =
          c.channel === 'email'
            ? await sendEmail({ to: r.to, subject: c.subject, html: `<p>${body.replace(/\n/g, '<br/>')}</p>`, text: body })
            : await sendSms({ to: r.to, body });
        if (res.ok) sent++;
      })
    );
    void results;

    await db.collection(COLLECTION).doc(id).update({
      status: 'sent',
      recipientCount: recipients.length,
      sentCount: sent,
      sentAt: Timestamp.now(),
    });
    return { success: true as const, recipientCount: recipients.length, sentCount: sent };
  } catch (error) {
    console.error('sendCampaign failed:', error);
    return { success: false as const, error: 'Failed to send the campaign.' };
  }
}

export async function deleteCampaign(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true as const };
  } catch (error) {
    console.error('deleteCampaign failed:', error);
    return { success: false as const, error: 'Failed to delete the campaign.' };
  }
}
