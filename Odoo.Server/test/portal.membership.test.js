import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { Tax } from '../src/modules/settings/tax.model.js';
import { MembershipPlan } from '../src/modules/membership/plan.model.js';
import { buyMembership, getMe, register } from '../src/modules/portal/portal.service.js';

describe('portal membership purchase keeps the member signed in', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('buyMembership returns the same portal profile, still logged in, with the plan active', async () => {
    const tax = await Tax.create({
      name: 'GST 18%',
      ratePct: 18,
      components: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
      appliesTo: ['membership'],
      active: true,
    });

    const gold = await MembershipPlan.create({
      key: 'gold',
      name: 'Gold',
      colour: '#d4a017',
      version: 1,
      durations: [{ months: 1, pricePaise: 500000 }],
      eligibility: { minAge: 18 },
      entitlements: {
        court: {
          access: 'all',
          pricing: { mode: 'free', value: 0 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 14,
          sportKeys: [],
        },
        shopDiscountPct: 15,
        barDiscountPct: 15,
        perks: ['Locker'],
      },
      taxId: tax._id,
      active: true,
      sortOrder: 1,
    });

    const registered = await register({
      name: 'Yash Member',
      email: 'yash.member@test.arambh',
      phone: '9876543210',
      dob: '1995-04-12',
      password: 'password1',
    });

    const before = registered.user;
    expect(before.premium).toBe(false);
    expect(before.name).toBe('Yash Member');

    const bought = await buyMembership({
      accountId: before.id,
      planId: String(gold._id),
      durationMonths: 1,
      paymentMethod: 'upi',
    });

    expect(bought.profile).toBeTruthy();
    expect(bought.profile.id).toBe(before.id);
    expect(bought.profile.name).toBe(before.name);
    expect(bought.profile.email).toBe(before.email);
    expect(bought.profile.premium).toBe(true);
    expect(bought.profile.tierKey).toBe('gold');

    const still = await getMe(before.id);
    expect(still.id).toBe(before.id);
    expect(still.name).toBe('Yash Member');
    expect(still.premium).toBe(true);
    expect(still.tierKey).toBe('gold');
  });
});
