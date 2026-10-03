import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { setClock, resetClock } from '../src/lib/clock.js';
import { toLocalDate, localDateTimeToUtc, dayRange, alignToSlot, CLUB_TZ } from '../src/lib/time.js';

describe('time (IST)', () => {
  afterEach(() => {
    resetClock();
  });

  test('CLUB_TZ is Asia/Kolkata', () => {
    expect(CLUB_TZ).toBe('Asia/Kolkata');
  });

  test('toLocalDate uses club timezone', () => {
    // 2026-10-03 00:30 UTC = 2026-10-03 06:00 IST
    setClock({ now: () => new Date('2026-10-03T00:30:00.000Z') });
    expect(toLocalDate()).toBe('2026-10-03');

    // 2026-10-02 19:30 UTC = 2026-10-03 01:00 IST
    expect(toLocalDate(new Date('2026-10-02T19:30:00.000Z'))).toBe('2026-10-03');

    // 2026-10-02 18:29 UTC = 2026-10-02 23:59 IST
    expect(toLocalDate(new Date('2026-10-02T18:29:00.000Z'))).toBe('2026-10-02');
  });

  test('localDateTimeToUtc and dayRange boundaries', () => {
    const start = localDateTimeToUtc('2026-10-03', '00:00');
    expect(start.toISOString()).toBe('2026-10-02T18:30:00.000Z');

    const sixPm = localDateTimeToUtc('2026-10-03', '18:00');
    expect(sixPm.toISOString()).toBe('2026-10-03T12:30:00.000Z');

    const { startUtc, endUtc } = dayRange('2026-10-03');
    expect(startUtc.toISOString()).toBe('2026-10-02T18:30:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-10-03T18:30:00.000Z');
    expect(endUtc.getTime() - startUtc.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  test('alignToSlot floors to 30 minutes', () => {
    const d = localDateTimeToUtc('2026-10-03', '18:17');
    const aligned = alignToSlot(d, 30);
    expect(aligned.toISOString()).toBe(localDateTimeToUtc('2026-10-03', '18:00').toISOString());
  });
});
