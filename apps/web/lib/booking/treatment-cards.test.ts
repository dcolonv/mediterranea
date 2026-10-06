import { describe, it, expect } from 'vitest';
import { treatmentCards } from './treatment-cards';

const svc = (id: string, bookingGroup = '') => ({ id, bookingGroup });
const layout = (services: { id: string; bookingGroup: string }[]) =>
  treatmentCards(services).map((c) =>
    c.kind === 'service' ? c.service.id : `${c.group}[${c.services.map((s) => s.id).join(',')}]`
  );

describe('treatmentCards', () => {
  it('keeps catalogue order, placing each group where its first member sits', () => {
    expect(
      layout([
        svc('custom-facial', 'custom'),
        svc('brightening', 'focus'),
        svc('hydration', 'focus'),
        svc('indiba-full'),
        svc('indiba-focus'),
      ])
    ).toEqual(['custom[custom-facial]', 'focus[brightening,hydration]', 'indiba-full', 'indiba-focus']);
  });

  it('leads with a standalone treatment ordered first (e.g. a seasonal facial)', () => {
    expect(layout([svc('after-summer'), svc('custom-facial', 'custom'), svc('peeling', 'focus')])).toEqual([
      'after-summer',
      'custom[custom-facial]',
      'focus[peeling]',
    ]);
  });

  it('shows no card for a group without members', () => {
    expect(layout([svc('custom-facial', 'custom'), svc('indiba-full')])).toEqual([
      'custom[custom-facial]',
      'indiba-full',
    ]);
  });

  it('collects a group even when its members are not contiguous', () => {
    expect(layout([svc('a', 'indiba'), svc('b'), svc('c', 'indiba')])).toEqual(['indiba[a,c]', 'b']);
  });
});
