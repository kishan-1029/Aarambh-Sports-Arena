import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { Court } from '../src/modules/facilities/court.model.js';
import { Sport } from '../src/modules/facilities/sport.model.js';
import { Settings } from '../src/modules/settings/settings.model.js';
import { courtPrice, isPeak } from '../src/modules/booking/pricing.service.js';
import { localDateTimeToUtc, toLocalDate, addMinutesUtc } from '../src/lib/time.js';
import { setClock, resetClock } from '../src/lib/clock.js';

describe('booking pricing matrix', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    resetClock();
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    resetClock();
    await clearCollections();
    await Settings.create({ locationId: null, trialPricePaise: 0 });
  });

  async function courtFixture() {
    const sport = await Sport.create({
      key: 'tennis',
      name: 'Tennis',
      sessionMinutes: 60,
      slotStepMinutes: 30,
      active: true,
    });
    return Court.create({
      sportId: sport._id,
      name: 'T1',
      code: 'T1',
      status: 'active',
      pricing: {
        walkInPaise: { peak: 100000, offPeak: 70000 },
        memberBasePaise: { peak: 80000, offPeak: 50000 },
        peakWindows: [{ dow: [1, 2, 3, 4, 5], from: '17:00', to: '22:00' }],
      },
    });
  }

  function nextWeekdayPeak() {
    // Find next Mon–Fri local date
    let d = toLocalDate();
    for (let i = 1; i <= 10; i += 1) {
      const noon = localDateTimeToUtc(d, '12:00');
      const next = toLocalDate(addMinutesUtc(noon, 24 * 60));
      const start = localDateTimeToUtc(next, '18:00');
      const court = {
        pricing: { peakWindows: [{ dow: [1, 2, 3, 4, 5], from: '17:00', to: '22:00' }] },
      };
      if (isPeak(court, start)) {
        setClock({ now: () => localDateTimeToUtc(next, '08:00') });
        return start;
      }
      d = next;
    }
    throw new Error('no peak weekday found');
  }

  test('Gold free at peak', async () => {
    const court = await courtFixture();
    const start = nextWeekdayPeak();
    const price = await courtPrice({
      court,
      startUtc: start,
      entitlements: {
        planKey: 'gold',
        membershipId: 'x',
        court: { pricing: { mode: 'free', value: 0 } },
      },
    });
    expect(price.totalPaise).toBe(0);
    expect(price.rule).toBe('gold_free');
  });

  test('Silver 50% of member base at peak', async () => {
    const court = await courtFixture();
    const start = nextWeekdayPeak();
    const price = await courtPrice({
      court,
      startUtc: start,
      entitlements: {
        planKey: 'silver',
        membershipId: 'x',
        court: { pricing: { mode: 'discount_pct', value: 50 } },
      },
    });
    expect(price.totalPaise).toBe(40000); // 50% of 80000, no tax on court in this fixture
    expect(price.rule).toContain('silver');
  });

  test('walk-in peak vs off-peak', async () => {
    const court = await courtFixture();
    const peakStart = nextWeekdayPeak();
    const peak = await courtPrice({ court, startUtc: peakStart, type: 'walk_in' });
    expect(peak.totalPaise).toBe(100000);

    const off = localDateTimeToUtc(toLocalDate(peakStart), '10:00');
    const offPrice = await courtPrice({ court, startUtc: off, type: 'walk_in' });
    expect(offPrice.totalPaise).toBe(70000);
  });
});
