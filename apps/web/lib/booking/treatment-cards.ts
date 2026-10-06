import type { BookingGroup } from '@mediterranea/shared/types';

/** One card on a "choose a treatment" grid: a single treatment, or a booking group. */
export type TreatmentCard<S> =
  | { kind: 'service'; service: S }
  | { kind: 'group'; group: BookingGroup; services: S[] };

const GROUPS: readonly string[] = ['custom', 'focus', 'indiba'] satisfies BookingGroup[];

/**
 * Lay out treatment cards in catalogue order. Services arrive sorted by
 * displayOrder; each standalone treatment gets its own card, and each booking
 * group one card, placed where its first member sits. A group with no active
 * members simply has no card, so ungrouping a treatment can't leave an empty
 * group behind.
 */
export function treatmentCards<S extends { bookingGroup?: string }>(services: S[]): TreatmentCard<S>[] {
  const cards: TreatmentCard<S>[] = [];
  const groups = new Map<string, { kind: 'group'; group: BookingGroup; services: S[] }>();
  for (const service of services) {
    const group = service.bookingGroup ?? '';
    if (!GROUPS.includes(group)) {
      cards.push({ kind: 'service', service });
      continue;
    }
    let card = groups.get(group);
    if (!card) {
      card = { kind: 'group', group: group as BookingGroup, services: [] };
      groups.set(group, card);
      cards.push(card);
    }
    card.services.push(service);
  }
  return cards;
}
