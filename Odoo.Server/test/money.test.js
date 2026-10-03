import { describe, expect, test } from '@jest/globals';
import { toPaise, formatINR, pct, sum, splitResidue, computeLine } from '../src/lib/money.js';

describe('money', () => {
  test('toPaise and formatINR', () => {
    expect(toPaise(10)).toBe(1000);
    expect(toPaise(10.5)).toBe(1050);
    expect(formatINR(1050)).toBe('₹10.50');
    expect(formatINR(-50)).toBe('-₹0.50');
  });

  test('pct rounds half-up', () => {
    expect(pct(100, 18)).toBe(18);
    expect(pct(101, 50)).toBe(51); // 50.5 → 51
    expect(pct(1, 50)).toBe(1); // 0.5 → 1
  });

  test('sum requires integers', () => {
    expect(sum(1, 2, 3)).toBe(6);
    expect(() => sum(1.5)).toThrow();
  });

  test('splitResidue puts remainder on last part', () => {
    expect(splitResidue(100, 3)).toEqual([33, 33, 34]);
    expect(splitResidue(10, 4)).toEqual([2, 2, 2, 4]);
    expect(splitResidue(7, 1)).toEqual([7]);
  });

  test('computeLine discount then tax', () => {
    const line = computeLine({
      unitPricePaise: 10000,
      qty: 2,
      discountPct: 10,
      tax: [{ name: 'CGST', ratePct: 9 }, { name: 'SGST', ratePct: 9 }],
    });
    expect(line.basePaise).toBe(20000);
    expect(line.discountPaise).toBe(2000);
    expect(line.taxablePaise).toBe(18000);
    expect(line.taxPaise).toBe(3240); // 1620 + 1620
    expect(line.totalPaise).toBe(21240);
  });
});
