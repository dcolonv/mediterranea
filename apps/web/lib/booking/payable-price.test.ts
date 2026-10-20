import { describe, it, expect } from 'vitest';
import { payablePrice } from '@mediterranea/shared/utils';

describe('payablePrice', () => {
  it('charges the launch / first-visit price while one is set below the regular price', () => {
    expect(payablePrice({ price: 120, firstVisitPrice: 100 })).toBe(100);
  });

  it('charges the regular price otherwise', () => {
    expect(payablePrice({ price: 120 })).toBe(120);
    expect(payablePrice({ price: 120, firstVisitPrice: 0 })).toBe(120);
    // A "launch price" above the regular one is ignored, as on the price tags.
    expect(payablePrice({ price: 75, firstVisitPrice: 90 })).toBe(75);
  });
});
