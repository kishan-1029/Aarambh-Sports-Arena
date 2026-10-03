import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import { Member } from '../src/modules/members/member.model.js';
import { Membership } from '../src/modules/membership/membership.model.js';
import { MembershipPlan } from '../src/modules/membership/plan.model.js';
import { Tax } from '../src/modules/settings/tax.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { register as registerMember, ageYearsAt } from '../src/modules/members/member.service.js';
import {
  purchase,
  renew,
  updatePlan,
  expireDue,
  sendReminders,
  entitlementsFor,
} from '../src/modules/membership/membership.service.js';
import { toLocalDate, localDateTimeToUtc } from '../src/lib/time.js';
import { AppError } from '../src/lib/errors.js';

describe('membership', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  async function seedPlans() {
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

    const junior = await MembershipPlan.create({
      key: 'junior',
      name: 'Junior',
      colour: '#2e7d32',
      version: 1,
      durations: [{ months: 1, pricePaise: 150000 }],
      eligibility: { maxAge: 17 },
      entitlements: {
        court: {
          access: 'off_peak_only',
          pricing: { mode: 'discount_pct', value: 50 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 7,
          sportKeys: [],
        },
        shopDiscountPct: 10,
        barDiscountPct: 0,
        perks: [],
      },
      taxId: tax._id,
      active: true,
      sortOrder: 3,
    });

    const gold = await MembershipPlan.create({
      key: 'gold',
      name: 'Gold',
      colour: '#d4a017',
      version: 1,
      durations: [
        { months: 1, pricePaise: 500000 },
        { months: 3, pricePaise: 1350000 },
      ],
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

    return { tax, junior, gold };
  }

  test('junior purchase fails when member turned 18 today', async () => {
    const { junior } = await seedPlans();
    const today = toLocalDate();
    const [y, m, d] = today.split('-').map(Number);
    const dob18 = `${y - 18}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    expect(ageYearsAt(dob18)).toBe(18);

    const member = await registerMember({
      firstName: 'Almost',
      lastName: 'Adult',
      phone: '9111111111',
      email: 'adult@test.arambh',
      dob: dob18,
    });

    await expect(
      purchase({
        memberId: String(member._id),
        planId: String(junior._id),
        months: 1,
        paymentMethod: 'cash',
      }),
    ).rejects.toMatchObject({ code: 'ENTITLEMENT_DENIED' });
  });

  test('two concurrent purchases yield exactly one active membership', async () => {
    const { gold } = await seedPlans();
    const member = await registerMember({
      firstName: 'Race',
      lastName: 'Member',
      phone: '9222222222',
      email: 'race@test.arambh',
      dob: '1990-01-01',
    });

    const input = {
      memberId: String(member._id),
      planId: String(gold._id),
      months: 1,
      paymentMethod: 'cash',
    };

    const results = await Promise.allSettled([purchase(input), purchase(input)]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(AppError);

    const active = await Membership.countDocuments({
      memberId: member._id,
      status: 'active',
    });
    expect(active).toBe(1);
  });

  test('renewal starts the day after current end date', async () => {
    const { gold } = await seedPlans();
    const member = await registerMember({
      firstName: 'Renew',
      lastName: 'Me',
      phone: '9333333333',
      email: 'renew@test.arambh',
      dob: '1988-05-05',
    });

    const first = await purchase({
      memberId: String(member._id),
      planId: String(gold._id),
      months: 1,
      paymentMethod: 'cash',
    });

    const renewed = await renew(String(first.membership._id), 1);
    expect(renewed.membership.renewalOfId).toBeTruthy();
    expect(renewed.membership.startLocalDate > first.membership.endLocalDate).toBe(true);

    const expectedStart = (() => {
      const noon = localDateTimeToUtc(first.membership.endLocalDate, '12:00');
      return toLocalDate(new Date(noon.getTime() + 86400000));
    })();
    expect(renewed.membership.startLocalDate).toBe(expectedStart);
    expect(['scheduled', 'active']).toContain(renewed.membership.status);
  });

  test('plan edit with active memberships creates a new version; old snapshot kept', async () => {
    const { gold } = await seedPlans();
    const member = await registerMember({
      firstName: 'Snap',
      lastName: 'Shot',
      phone: '9444444444',
      email: 'snap@test.arambh',
      dob: '1985-03-03',
    });

    const bought = await purchase({
      memberId: String(member._id),
      planId: String(gold._id),
      months: 1,
      paymentMethod: 'cash',
    });
    expect(bought.membership.entitlementsSnapshot.shopDiscountPct).toBe(15);

    const { plan, versioned } = await updatePlan(String(gold._id), {
      entitlements: {
        ...gold.entitlements,
        shopDiscountPct: 25,
      },
      durations: [{ months: 1, pricePaise: 600000 }],
    });

    expect(versioned).toBe(true);
    expect(plan.version).toBe(2);
    expect(plan.shopDiscountPct ?? plan.entitlements.shopDiscountPct).toBe(25);

    const oldMembership = await Membership.findById(bought.membership._id).lean();
    expect(oldMembership.entitlementsSnapshot.shopDiscountPct).toBe(15);
    expect(oldMembership.planVersion).toBe(1);

    const ents = await entitlementsFor(String(member._id));
    expect(ents.shopDiscountPct).toBe(15);
  });

  test('expire job sets statuses; reminder job is idempotent', async () => {
    const { gold } = await seedPlans();
    const member = await registerMember({
      firstName: 'Expire',
      lastName: 'Soon',
      phone: '9555555555',
      email: 'expire@test.arambh',
      dob: '1992-06-06',
    });

    const today = toLocalDate();
    const endLocal = (() => {
      const noon = localDateTimeToUtc(today, '12:00');
      return toLocalDate(new Date(noon.getTime() - 86400000)); // yesterday
    })();
    const startLocal = (() => {
      const noon = localDateTimeToUtc(endLocal, '12:00');
      return toLocalDate(new Date(noon.getTime() - 30 * 86400000));
    })();

    const ms = await Membership.create({
      memberId: member._id,
      planId: gold._id,
      planKey: 'gold',
      planVersion: 1,
      entitlementsSnapshot: gold.entitlements,
      startDate: localDateTimeToUtc(startLocal, '00:00'),
      endDate: localDateTimeToUtc(endLocal, '23:59'),
      startLocalDate: startLocal,
      endLocalDate: endLocal,
      status: 'active',
      pricePaise: 500000,
      durationMonths: 1,
    });
    await Member.findByIdAndUpdate(member._id, {
      $set: {
        currentMembershipId: ms._id,
        status: 'active',
        tierKey: 'gold',
        membershipEndDate: ms.endDate,
      },
    });

    const exp1 = await expireDue();
    expect(exp1.expired).toBe(1);
    const after = await Membership.findById(ms._id).lean();
    expect(after.status).toBe('expired');
    const mem = await Member.findById(member._id).lean();
    expect(mem.status).toBe('expired');
    expect(mem.tierKey).toBe('none');

    // Reminder idempotency: membership ending in 7 days
    const end7 = (() => {
      const noon = localDateTimeToUtc(today, '12:00');
      return toLocalDate(new Date(noon.getTime() + 7 * 86400000));
    })();
    const member2 = await registerMember({
      firstName: 'Remind',
      lastName: 'Me',
      phone: '9666666666',
      email: 'remind@test.arambh',
      dob: '1991-07-07',
    });
    await Membership.create({
      memberId: member2._id,
      planId: gold._id,
      planKey: 'gold',
      planVersion: 1,
      entitlementsSnapshot: gold.entitlements,
      startDate: localDateTimeToUtc(today, '00:00'),
      endDate: localDateTimeToUtc(end7, '23:59'),
      startLocalDate: today,
      endLocalDate: end7,
      status: 'active',
      pricePaise: 500000,
      durationMonths: 1,
    });

    const r1 = await sendReminders();
    const r2 = await sendReminders();
    expect(r1.sent).toBeGreaterThanOrEqual(1);
    expect(r2.sent).toBe(0);

    const notifs = await Notification.countDocuments({
      'data.memberId': String(member2._id),
    });
    expect(notifs).toBe(1);
  });
});
