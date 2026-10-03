import { describe, expect, test } from '@jest/globals';
import { benefitLinesForPlan } from '../src/modules/membership/benefitLines.js';

describe('membership benefit lines', () => {
  test('gold lines match a free-court plan with guest passes', () => {
    expect(
      benefitLinesForPlan(
        {
          court: {
            access: 'all',
            pricing: { mode: 'free', value: 0 },
            maxBookingsPerDay: 2,
            advanceBookingDays: 14,
          },
          shopDiscountPct: 15,
          barDiscountPct: 15,
          guestPasses: 2,
        },
        ['Locker', 'Free towel'],
      ),
    ).toEqual([
      'All courts',
      'Court time included',
      'Up to 2 bookings / day',
      'Book 14 days ahead',
      '15% shop discount',
      '15% bar discount',
      '2 guest passes',
      'Locker',
      'Free towel',
    ]);
  });

  test('silver lines match a 50% court plan with shop and bar savings', () => {
    expect(
      benefitLinesForPlan({
        court: {
          access: 'all',
          pricing: { mode: 'discount_pct', value: 50 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 14,
        },
        shopDiscountPct: 10,
        barDiscountPct: 10,
        guestPasses: 0,
      }),
    ).toEqual([
      'All courts',
      '50% off court time',
      'Up to 2 bookings / day',
      'Book 14 days ahead',
      '10% shop discount',
      '10% bar discount',
    ]);
  });

  test('junior lines stay off-peak and keep the coaching extra', () => {
    expect(
      benefitLinesForPlan(
        {
          court: {
            access: 'off_peak_only',
            pricing: { mode: 'discount_pct', value: 50 },
            maxBookingsPerDay: 2,
            advanceBookingDays: 7,
          },
          shopDiscountPct: 10,
          barDiscountPct: 0,
          guestPasses: 0,
        },
        ['Junior coaching discount'],
      ),
    ).toEqual([
      'Off-peak courts',
      '50% off court time',
      'Up to 2 bookings / day',
      'Book 7 days ahead',
      '10% shop discount',
      'Junior coaching discount',
    ]);
  });

  test('a zero court discount does not invent a court-rate line', () => {
    expect(
      benefitLinesForPlan({
        court: {
          access: 'all',
          pricing: { mode: 'discount_pct', value: 0 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 14,
        },
        shopDiscountPct: 20,
        barDiscountPct: 20,
        guestPasses: 0,
      }),
    ).toEqual([
      'All courts',
      'Up to 2 bookings / day',
      'Book 14 days ahead',
      '20% shop discount',
      '20% bar discount',
    ]);
  });
});
