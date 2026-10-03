/**
 * docs/08-Booking-Engine.md §14 — concurrency suite (MongoMemoryReplSet).
 */
import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from '../helpers/memoryMongo.js';
import { Sport } from '../../src/modules/facilities/sport.model.js';
import { Court } from '../../src/modules/facilities/court.model.js';
import { Location } from '../../src/modules/settings/location.model.js';
import { Settings } from '../../src/modules/settings/settings.model.js';
import { Tax } from '../../src/modules/settings/tax.model.js';
import { MembershipPlan } from '../../src/modules/membership/plan.model.js';
import { Membership } from '../../src/modules/membership/membership.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { SlotLock } from '../../src/modules/booking/slotLock.model.js';
import { MemberDayCounter } from '../../src/modules/booking/memberDayCounter.model.js';
import { SocialSession } from '../../src/modules/booking/socialSession.model.js';
import { SocialParticipant } from '../../src/modules/booking/socialParticipant.model.js';
import { register as registerMember } from '../../src/modules/members/member.service.js';
import { create as createBooking, cancel, confirmPayment, expireHolds } from '../../src/modules/booking/booking.service.js';
import { create as createBlock } from '../../src/modules/booking/courtBlock.service.js';
import { create as createSocial, join as joinSocial } from '../../src/modules/booking/socialSession.service.js';
import { localDateTimeToUtc, toLocalDate, addMinutesUtc } from '../../src/lib/time.js';
import { setClock, resetClock } from '../../src/lib/clock.js';
import { AppError } from '../../src/lib/errors.js';

describe('booking concurrency (docs/08 §14)', () => {
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
  });

  async function seedClub() {
    const location = await Location.create({
      name: 'Main',
      code: 'MAIN',
      openingHours: [
        { dow: 0, open: '06:00', close: '23:00' },
        { dow: 1, open: '06:00', close: '23:00' },
        { dow: 2, open: '06:00', close: '23:00' },
        { dow: 3, open: '06:00', close: '23:00' },
        { dow: 4, open: '06:00', close: '23:00' },
        { dow: 5, open: '06:00', close: '23:00' },
        { dow: 6, open: '06:00', close: '23:00' },
      ],
    });
    await Settings.create({
      locationId: null,
      holdMinutes: 10,
      maxAdvanceDays: 30,
      minLeadMinutes: 0,
      bookingCancelFreeHours: 4,
    });
    const tax = await Tax.create({
      name: 'GST 18%',
      ratePct: 18,
      components: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
      appliesTo: ['court', 'membership'],
      active: true,
    });
    const sport = await Sport.create({
      key: 'tennis',
      name: 'Tennis',
      sessionMinutes: 60,
      slotStepMinutes: 30,
      active: true,
    });
    const plan = await MembershipPlan.create({
      key: 'gold',
      name: 'Gold',
      colour: '#d4a017',
      version: 1,
      durations: [{ months: 1, pricePaise: 500000 }],
      entitlements: {
        court: {
          access: 'all',
          pricing: { mode: 'free', value: 0 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 14,
          sportKeys: [],
        },
        shopDiscountPct: 0,
        barDiscountPct: 0,
        perks: [],
      },
      taxId: tax._id,
      active: true,
    });
    return { location, tax, sport, plan };
  }

  async function makeCourt(sport, location, code = 'T1') {
    return Court.create({
      sportId: sport._id,
      locationId: location._id,
      name: `Court ${code}`,
      code,
      status: 'active',
      pricing: {
        walkInPaise: { peak: 100000, offPeak: 70000 },
        memberBasePaise: { peak: 80000, offPeak: 50000 },
        peakWindows: [{ dow: [1, 2, 3, 4, 5], from: '17:00', to: '22:00' }],
      },
    });
  }

  async function makeGoldMember(plan, suffix) {
    const member = await registerMember({
      firstName: 'M',
      lastName: String(suffix),
      phone: `9${String(suffix).padStart(9, '0')}`,
      email: `m${suffix}@test.arambh`,
      dob: '1990-01-01',
    });
    const today = toLocalDate();
    const endLocal = '2099-12-31';
    const ms = await Membership.create({
      memberId: member._id,
      planId: plan._id,
      planKey: 'gold',
      planVersion: 1,
      entitlementsSnapshot: plan.entitlements,
      startDate: localDateTimeToUtc(today, '00:00'),
      endDate: localDateTimeToUtc(endLocal, '23:59'),
      startLocalDate: today,
      endLocalDate: endLocal,
      status: 'active',
      pricePaise: 500000,
      durationMonths: 1,
    });
    return { member, membership: ms };
  }

  function tomorrowSlot(hhmm = '18:00') {
    const today = toLocalDate();
    const noon = localDateTimeToUtc(today, '12:00');
    const tomorrow = toLocalDate(addMinutesUtc(noon, 24 * 60));
    const startUtc = localDateTimeToUtc(tomorrow, hhmm);
    // Freeze "now" to morning of booking day so slots are not past
    setClock({ now: () => localDateTimeToUtc(tomorrow, '08:00') });
    return { localDate: tomorrow, startUtc };
  }

  test('1) 50 parallel same court/start → 1 confirmed + 2 slotLocks', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { startUtc } = tomorrowSlot('18:00');

    const members = [];
    for (let i = 0; i < 50; i += 1) {
      members.push(await makeGoldMember(plan, i + 1));
    }

    const results = await Promise.allSettled(
      members.map(({ member }, idx) =>
        createBooking(
          {
            courtId: String(court._id),
            startUtc,
            memberId: String(member._id),
            type: 'member',
            payment: { mode: 'free' },
            channel: 'admin',
            idempotencyKey: `race-50-${idx}`,
          },
          { source: 'system' },
        ),
      ),
    );

    const ok = results.filter((r) => r.status === 'fulfilled');
    const fail = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBe(1);
    expect(fail.length).toBe(49);
    for (const f of fail) {
      expect(f.reason).toBeInstanceOf(AppError);
      expect(f.reason.code).toBe('SLOT_UNAVAILABLE');
    }

    expect(await Booking.countDocuments({ status: 'confirmed' })).toBe(1);
    expect(await SlotLock.countDocuments({ courtId: court._id })).toBe(2);
  }, 180_000);

  test('2) overlap 18:00 vs 18:30 → exactly one succeeds', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { localDate } = tomorrowSlot('18:00');
    const a = localDateTimeToUtc(localDate, '18:00');
    const b = localDateTimeToUtc(localDate, '18:30');
    const m1 = await makeGoldMember(plan, 101);
    const m2 = await makeGoldMember(plan, 102);

    const results = await Promise.allSettled([
      createBooking({
        courtId: String(court._id),
        startUtc: a,
        memberId: String(m1.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'ov-a',
      }),
      createBooking({
        courtId: String(court._id),
        startUtc: b,
        memberId: String(m2.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'ov-b',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
  }, 60_000);

  test('3) adjacent 18:00 and 19:00 → both succeed', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { localDate } = tomorrowSlot('18:00');
    const a = localDateTimeToUtc(localDate, '18:00');
    const b = localDateTimeToUtc(localDate, '19:00');
    const m1 = await makeGoldMember(plan, 201);
    const m2 = await makeGoldMember(plan, 202);

    const results = await Promise.allSettled([
      createBooking({
        courtId: String(court._id),
        startUtc: a,
        memberId: String(m1.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'adj-a',
      }),
      createBooking({
        courtId: String(court._id),
        startUtc: b,
        memberId: String(m2.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'adj-b',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(2);
    expect(await SlotLock.countDocuments({ courtId: court._id })).toBe(4);
  }, 60_000);

  test('4) daily limit: 5 parallel on 5 courts → 2 ok, 3 DAILY_LIMIT', async () => {
    const { location, sport, plan } = await seedClub();
    const courts = [];
    for (let i = 1; i <= 5; i += 1) {
      courts.push(await makeCourt(sport, location, `D${i}`));
    }
    const { localDate, startUtc } = tomorrowSlot('18:00');
    const { member } = await makeGoldMember(plan, 301);

    const results = await Promise.allSettled(
      courts.map((c, idx) =>
        createBooking({
          courtId: String(c._id),
          startUtc,
          memberId: String(member._id),
          payment: { mode: 'free' },
          idempotencyKey: `day-${idx}`,
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const fail = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBe(2);
    expect(fail.length).toBe(3);
    for (const f of fail) {
      expect(f.reason.code).toBe('DAILY_LIMIT_REACHED');
    }
    const counter = await MemberDayCounter.findOne({
      memberId: member._id,
      localDate,
    }).lean();
    expect(counter.count).toBe(2);
  }, 60_000);

  test('5) hold expiry then second user books; late confirm → HOLD_EXPIRED', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { localDate } = tomorrowSlot('18:00');
    const startUtc = localDateTimeToUtc(localDate, '18:00');
    const morning = localDateTimeToUtc(localDate, '08:00');
    setClock({ now: () => morning });

    const m1 = await makeGoldMember(plan, 401);
    // Force a paid hold path by using walk-in pricing (no free) — use member with walk-in payment online
    // Create silver-like member without free: temporarily book as walk_in with online hold
    const held = await createBooking({
      courtId: String(court._id),
      startUtc,
      type: 'walk_in',
      customer: { name: 'Hold User', phone: '9000000401' },
      payment: { mode: 'online' },
      channel: 'website',
      idempotencyKey: 'hold-1',
    });
    expect(held.status).toBe('held');
    expect(await SlotLock.countDocuments({ kind: 'hold' })).toBe(2);

    const afterExpiry = addMinutesUtc(morning, 15);
    setClock({ now: () => afterExpiry });
    await expireHolds();

    const m2 = await makeGoldMember(plan, 402);
    const second = await createBooking({
      courtId: String(court._id),
      startUtc,
      memberId: String(m2.member._id),
      payment: { mode: 'free' },
      idempotencyKey: 'hold-2',
    });
    expect(second.status).toBe('confirmed');

    await expect(confirmPayment(String(held._id))).rejects.toMatchObject({
      code: 'HOLD_EXPIRED',
    });
  }, 60_000);

  test('6) cancel then parallel rebook → one success, no orphan locks', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { startUtc } = tomorrowSlot('18:00');
    const m1 = await makeGoldMember(plan, 501);
    const m2 = await makeGoldMember(plan, 502);
    const m3 = await makeGoldMember(plan, 503);

    const first = await createBooking({
      courtId: String(court._id),
      startUtc,
      memberId: String(m1.member._id),
      payment: { mode: 'free' },
      idempotencyKey: 'can-1',
    });
    await cancel(String(first._id), { reason: 'test' });

    const results = await Promise.allSettled([
      createBooking({
        courtId: String(court._id),
        startUtc,
        memberId: String(m2.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'can-2',
      }),
      createBooking({
        courtId: String(court._id),
        startUtc,
        memberId: String(m3.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'can-3',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(await SlotLock.countDocuments({ courtId: court._id })).toBe(2);
    const orphan = await SlotLock.find({ refId: first._id });
    expect(orphan.length).toBe(0);
  }, 60_000);

  test('7) social capacity 16, 40 parallel joins → 16 full', async () => {
    const { location, sport, plan } = await seedClub();
    const c1 = await makeCourt(sport, location, 'S1');
    const c2 = await makeCourt(sport, location, 'S2');
    const { localDate } = tomorrowSlot('19:00');
    const start = localDateTimeToUtc(localDate, '19:00');
    const end = localDateTimeToUtc(localDate, '22:00');

    const session = await createSocial({
      courtIds: [String(c1._id), String(c2._id)],
      sportId: String(sport._id),
      start,
      end,
      title: 'Friday Social',
      capacity: 16,
    });

    const members = [];
    for (let i = 0; i < 40; i += 1) {
      members.push(await makeGoldMember(plan, 600 + i));
    }

    const results = await Promise.allSettled(
      members.map(({ member }) =>
        joinSocial(String(session._id), {
          memberId: String(member._id),
          name: `${member.firstName} ${member.lastName}`,
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBe(16);
    const fresh = await SocialSession.findById(session._id).lean();
    expect(fresh.joinedCount).toBe(16);
    expect(fresh.status).toBe('full');
    expect(await SocialParticipant.countDocuments({ sessionId: session._id })).toBe(16);
  }, 180_000);

  test('8) block vs booking parallel → one wins, no partial state', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { localDate, startUtc } = tomorrowSlot('18:00');
    const endUtc = addMinutesUtc(startUtc, 60);
    const { member } = await makeGoldMember(plan, 701);

    const results = await Promise.allSettled([
      createBooking({
        courtId: String(court._id),
        startUtc,
        memberId: String(member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'blk-book',
      }),
      createBlock({
        courtId: String(court._id),
        start: startUtc,
        end: endUtc,
        reason: 'maintenance',
      }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBe(1);
    const locks = await SlotLock.find({ courtId: court._id }).lean();
    expect(locks.length).toBe(2);
    const kinds = new Set(locks.map((l) => l.kind));
    expect(kinds.size).toBe(1);
  }, 60_000);

  test('9) abort leaves no booking and no counter increment', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { localDate, startUtc } = tomorrowSlot('18:00');
    const m1 = await makeGoldMember(plan, 801);
    const m2 = await makeGoldMember(plan, 802);

    await createBooking({
      courtId: String(court._id),
      startUtc,
      memberId: String(m1.member._id),
      payment: { mode: 'free' },
      idempotencyKey: 'abort-1',
    });

    await expect(
      createBooking({
        courtId: String(court._id),
        startUtc,
        memberId: String(m2.member._id),
        payment: { mode: 'free' },
        idempotencyKey: 'abort-2',
      }),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });

    expect(await Booking.countDocuments({ bookedByMemberId: m2.member._id })).toBe(0);
    const counter = await MemberDayCounter.findOne({
      memberId: m2.member._id,
      localDate,
    }).lean();
    expect(counter?.count || 0).toBe(0);
  }, 60_000);

  test('10) parallel same Idempotency-Key → one booking', async () => {
    const { location, sport, plan } = await seedClub();
    const court = await makeCourt(sport, location, 'T1');
    const { startUtc } = tomorrowSlot('18:00');
    const { member } = await makeGoldMember(plan, 901);

    const input = {
      courtId: String(court._id),
      startUtc,
      memberId: String(member._id),
      payment: { mode: 'free' },
      idempotencyKey: 'same-key-parallel',
    };

    const results = await Promise.allSettled([createBooking(input), createBooking(input)]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    // One may fulfill twice with same doc (idempotent replay) or one fulfill + one fulfill same
    const bookings = await Booking.find({ idempotencyKey: 'same-key-parallel' });
    expect(bookings.length).toBe(1);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(await SlotLock.countDocuments({ courtId: court._id })).toBe(2);
  }, 60_000);
});
