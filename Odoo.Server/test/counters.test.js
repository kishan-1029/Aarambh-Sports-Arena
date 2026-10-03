import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { nextNumber } from '../src/lib/counters.js';

describe('counters.nextNumber', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('formats sequence with padding', async () => {
    const a = await nextNumber('invoice:2026', 'INV-{YYYY}-{SEQ:5}');
    expect(a).toMatch(/^INV-\d{4}-00001$/);
    const b = await nextNumber('invoice:2026', 'INV-{YYYY}-{SEQ:5}');
    expect(b).toMatch(/00002$/);
  });

  test('parallel nextNumber yields unique sequence', async () => {
    const n = 40;
    const results = await Promise.all(
      Array.from({ length: n }, () => nextNumber('booking:parallel', '{SEQ}')),
    );
    const nums = results.map(Number).sort((a, b) => a - b);
    expect(new Set(nums).size).toBe(n);
    expect(nums[0]).toBe(1);
    expect(nums[n - 1]).toBe(n);
  });
});
