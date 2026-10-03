/**
 * Demo seed runner.
 * --reset deletes ONLY documents with isDemo: true. Never dropDatabase / unfiltered deleteMany.
 */
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';
import {
  Notification,
  NotificationTemplate,
} from '../modules/notifications/notification.model.js';
import { DEFAULT_TEMPLATES } from '../modules/notifications/notificationTemplates.js';
import { audit } from '../modules/audit/audit.service.js';
import { ArambhRole } from '../modules/auth/role.model.js';
import { seedArambhRoles } from '../modules/auth/seedRoles.js';
import { Location } from '../modules/settings/location.model.js';
import { Settings } from '../modules/settings/settings.model.js';
import { Tax } from '../modules/settings/tax.model.js';
import { Customer } from '../modules/customers/customer.model.js';
import { Invoice } from '../modules/finance/invoice.model.js';
import { Payment } from '../modules/finance/payment.model.js';
import { createAndPost } from '../modules/finance/invoice.service.js';
import { Member } from '../modules/members/member.model.js';
import { MembershipPlan } from '../modules/membership/plan.model.js';
import { Membership } from '../modules/membership/membership.model.js';
import { ActivityEvent } from '../modules/membership/activity.model.js';
import { register as registerMember } from '../modules/members/member.service.js';
import { purchase as purchaseMembership } from '../modules/membership/membership.service.js';
import { Sport } from '../modules/facilities/sport.model.js';
import { Court } from '../modules/facilities/court.model.js';
import { CourtBlock } from '../modules/facilities/courtBlock.model.js';
import { Booking } from '../modules/booking/booking.model.js';
import { SlotLock } from '../modules/booking/slotLock.model.js';
import { MemberDayCounter } from '../modules/booking/memberDayCounter.model.js';
import { SocialSession } from '../modules/booking/socialSession.model.js';
import { SocialParticipant } from '../modules/booking/socialParticipant.model.js';
import { toLocalDate, localDateTimeToUtc, addMinutesUtc } from '../lib/time.js';
import { create as createBooking } from '../modules/booking/booking.service.js';
import { Lead } from '../modules/public/lead.model.js';
import { seedMenus } from './seedMenus.js';
import { seedBlogs } from './seedBlogs.js';
import {
  seedExtraMembers,
  seedExtraCustomers,
  seedExtraInvoices,
  seedExtraBookings,
  seedExtraLeads,
} from './seedDemoVolume.js';

const clubSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    clubName: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    priceIncludesTax: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ClubSettings =
  mongoose.models.ClubSettings ||
  mongoose.model('ClubSettings', clubSettingsSchema, 'clubSettings');

async function resetDemo() {
  const collections = [
    ClubSettings,
    Notification,
    NotificationTemplate,
    ArambhRole,
    Location,
    Settings,
    Tax,
    Customer,
    Invoice,
    Payment,
    Member,
    MembershipPlan,
    Membership,
    ActivityEvent,
    Sport,
    Court,
    CourtBlock,
    Booking,
    SlotLock,
    MemberDayCounter,
    SocialSession,
    SocialParticipant,
    Lead,
  ];

  for (const Model of collections) {
    const res = await Model.deleteMany({ isDemo: true });
    logger.info({ model: Model.modelName, deleted: res.deletedCount }, 'demo reset');
  }
}

async function seedClub() {
  await ClubSettings.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      clubName: 'Aarambh Sports Arena',
      timezone: config.clubTimezone,
      currency: 'INR',
      priceIncludesTax: false,
      isDemo: true,
    },
    { upsert: true, new: true },
  );

  const location = await Location.findOneAndUpdate(
    { code: 'MAIN', isDemo: true },
    {
      name: 'Aarambh Sports Arena — Main',
      code: 'MAIN',
      address: 'Vadodara, Gujarat',
      timezone: 'Asia/Kolkata',
      phone: '+91-9999999999',
      gstin: '24AAAAA0000A1Z5',
      openingHours: [
        { dow: 1, open: '06:00', close: '23:00' },
        { dow: 2, open: '06:00', close: '23:00' },
        { dow: 3, open: '06:00', close: '23:00' },
        { dow: 4, open: '06:00', close: '23:00' },
        { dow: 5, open: '06:00', close: '23:00' },
        { dow: 6, open: '06:00', close: '22:00' },
        { dow: 0, open: '07:00', close: '21:00' },
      ],
      isDemo: true,
    },
    { upsert: true, new: true },
  );

  await Settings.findOneAndUpdate(
    { locationId: null },
    {
      locationId: null,
      clubName: 'Aarambh Sports Arena',
      currency: 'INR',
      priceIncludesTax: false,
      bookingCancelFreeHours: 4,
      holdMinutes: 10,
      maxAdvanceDays: 14,
      minLeadMinutes: 30,
      trialPricePaise: 0,
      socialCountsTowardLimit: false,
      walkInMaxPerPhonePerDay: 4,
      walkInRequiresPhone: true,
      lowStockDefault: 5,
      invoicePrefix: 'INV',
      receiptFooter: 'Thank you for visiting Arambh Sports Arena',
      paymentsProvider: config.paymentsProvider || 'mock',
      isDemo: true,
    },
    { upsert: true, new: true },
  );

  logger.info({ locationId: String(location._id) }, 'seeded club settings + location');
  return location;
}

async function seedTaxes() {
  const specs = [
    {
      name: 'GST 18%',
      ratePct: 18,
      components: [
        { name: 'CGST', ratePct: 9 },
        { name: 'SGST', ratePct: 9 },
      ],
      appliesTo: ['court', 'membership', 'shop', 'bar'],
    },
    {
      name: 'GST 5%',
      ratePct: 5,
      components: [
        { name: 'CGST', ratePct: 2.5 },
        { name: 'SGST', ratePct: 2.5 },
      ],
      appliesTo: ['shop', 'bar'],
    },
  ];

  const taxes = [];
  for (const t of specs) {
    const doc = await Tax.findOneAndUpdate(
      { name: t.name, isDemo: true },
      { ...t, active: true, isDemo: true },
      { upsert: true, new: true },
    );
    taxes.push(doc);
  }
  logger.info({ count: taxes.length }, 'seeded taxes');
  return taxes;
}

async function seedCustomers() {
  const specs = [
    {
      type: 'person',
      name: 'Riya Sharma',
      email: 'riya.demo@example.com',
      phone: '9876500001',
      tags: ['member'],
    },
    {
      type: 'person',
      name: 'Aarav Patel',
      email: 'aarav.demo@example.com',
      phone: '9876500002',
      tags: ['walk-in'],
    },
    {
      type: 'company',
      name: 'Demo Corp Events',
      email: 'billing@democorp.example.com',
      phone: '9876500003',
      gstin: '24BBBBB0000B1Z5',
      tags: ['b2b'],
      paymentTermsDays: 30,
    },
  ];

  const customers = [];
  for (const c of specs) {
    const doc = await Customer.findOneAndUpdate(
      { email: c.email, isDemo: true },
      { ...c, isDemo: true },
      { upsert: true, new: true },
    );
    customers.push(doc);
  }
  logger.info({ count: customers.length }, 'seeded customers');
  return customers;
}

async function seedSampleInvoice(customers, taxes, location) {
  const existing = await Invoice.findOne({ isDemo: true, kind: 'customer_invoice' }).lean();
  if (existing) {
    logger.info({ number: existing.number }, 'demo invoice already present');
    return existing;
  }

  const tax18 = taxes.find((t) => t.ratePct === 18) || taxes[0];
  const invoice = await createAndPost(
    {
      customerId: String(customers[0]._id),
      locationId: String(location._id),
      sourceType: 'manual',
      lines: [
        {
          description: 'Court hire — demo (1 hour)',
          revenueStream: 'court',
          qty: 1,
          unitPricePaise: 100000, // ₹1000
          discountPct: 0,
          taxId: String(tax18._id),
        },
      ],
      notes: 'Seeded demo invoice',
      post: true,
      isDemo: true,
    },
    { source: 'system', user: { name: 'seed' } },
  );
  logger.info({ number: invoice.number }, 'seeded sample posted invoice');
  return invoice;
}

async function seedMembershipPlans(taxes) {
  const tax18 = taxes.find((t) => t.ratePct === 18) || taxes[0];
  const specs = [
    {
      key: 'gold',
      name: 'Gold',
      description: 'Premium full-access membership',
      colour: '#d4a017',
      sortOrder: 1,
      durations: [
        { months: 1, pricePaise: 500000 },
        { months: 3, pricePaise: 1350000 },
        { months: 12, pricePaise: 4800000 },
      ],
      eligibility: { minAge: 18, maxAge: null },
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
        guestPasses: 2,
        perks: ['Locker', 'Free towel'],
      },
    },
    {
      key: 'silver',
      name: 'Silver',
      description: 'Standard membership',
      colour: '#8a8a8a',
      sortOrder: 2,
      durations: [
        { months: 1, pricePaise: 300000 },
        { months: 3, pricePaise: 810000 },
        { months: 12, pricePaise: 2880000 },
      ],
      eligibility: { minAge: 18, maxAge: null },
      entitlements: {
        court: {
          access: 'all',
          pricing: { mode: 'discount_pct', value: 50 },
          maxBookingsPerDay: 2,
          advanceBookingDays: 14,
          sportKeys: [],
        },
        shopDiscountPct: 10,
        barDiscountPct: 10,
        guestPasses: 0,
        perks: [],
      },
    },
    {
      key: 'junior',
      name: 'Junior',
      description: 'Under-18 discounted plan (off-peak courts)',
      colour: '#2e7d32',
      sortOrder: 3,
      durations: [
        { months: 1, pricePaise: 150000 },
        { months: 3, pricePaise: 400000 },
        { months: 12, pricePaise: 1400000 },
      ],
      eligibility: { minAge: null, maxAge: 17 },
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
        guestPasses: 0,
        perks: ['Junior coaching discount'],
      },
    },
  ];

  const plans = [];
  for (const s of specs) {
    const doc = await MembershipPlan.findOneAndUpdate(
      { key: s.key, version: 1, isDemo: true },
      {
        ...s,
        taxId: tax18?._id || null,
        version: 1,
        active: true,
        archivedAt: null,
        isDemo: true,
      },
      { upsert: true, new: true },
    );
    plans.push(doc);
  }
  logger.info({ count: plans.length }, 'seeded membership plans');
  return plans;
}

async function seedMembersAndMemberships(plans) {
  const gold = plans.find((p) => p.key === 'gold');
  const silver = plans.find((p) => p.key === 'silver');
  const junior = plans.find((p) => p.key === 'junior');
  const ctx = { source: 'system', user: { name: 'seed' } };

  const specs = [
    {
      firstName: 'Riya',
      lastName: 'Sharma',
      phone: '9876500001',
      email: 'riya.demo@example.com',
      dob: '1995-04-12',
      plan: gold,
      months: 12,
    },
    {
      firstName: 'Kabir',
      lastName: 'Mehta',
      phone: '9876500011',
      email: 'kabir.demo@example.com',
      dob: '1990-08-20',
      plan: silver,
      months: 3,
      endInDays: 5,
    },
    {
      firstName: 'Ananya',
      lastName: 'Shah',
      phone: '9876500012',
      email: 'ananya.demo@example.com',
      dob: '2012-01-15',
      plan: junior,
      months: 1,
      guardian: { name: 'Priya Shah', phone: '9876500099', relation: 'mother' },
    },
  ];

  const members = [];
  for (const s of specs) {
    let member = await Member.findOne({ email: s.email, isDemo: true });
    if (!member) {
      member = await registerMember(
        {
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          email: s.email,
          dob: s.dob,
          guardian: s.guardian,
          source: 'front_desk',
          isDemo: true,
        },
        ctx,
      );
    } else {
      member = member.toObject ? member.toObject() : member;
    }

    const existingMs = await Membership.findOne({
      memberId: member._id,
      status: { $in: ['active', 'scheduled'] },
      isDemo: true,
    });
    if (!existingMs && s.plan) {
      if (s.endInDays != null) {
        // Create short membership ending soon for expiring list
        const today = toLocalDate();
        const endLocal = (() => {
          const noon = localDateTimeToUtc(today, '12:00');
          return toLocalDate(new Date(noon.getTime() + s.endInDays * 86400000));
        })();
        const startLocal = (() => {
          const noon = localDateTimeToUtc(endLocal, '12:00');
          return toLocalDate(new Date(noon.getTime() - 25 * 86400000));
        })();
        await Membership.create({
          memberId: member._id,
          planId: s.plan._id,
          planKey: s.plan.key,
          planVersion: s.plan.version,
          entitlementsSnapshot: s.plan.entitlements,
          startDate: localDateTimeToUtc(startLocal, '00:00'),
          endDate: localDateTimeToUtc(endLocal, '23:59'),
          startLocalDate: startLocal,
          endLocalDate: endLocal,
          status: 'active',
          pricePaise: s.plan.durations[0].pricePaise,
          durationMonths: 1,
          isDemo: true,
        }).then(async (created) => {
          await Member.findByIdAndUpdate(member._id, {
            $set: {
              currentMembershipId: created._id,
              status: 'active',
              tierKey: s.plan.key,
              membershipEndDate: localDateTimeToUtc(endLocal, '23:59'),
            },
          });
        });
      } else {
        await purchaseMembership(
          {
            memberId: String(member._id),
            planId: String(s.plan._id),
            months: s.months,
            paymentMethod: 'cash',
            isDemo: true,
          },
          ctx,
        );
      }
    }
    members.push(member);
  }
  logger.info({ count: members.length }, 'seeded members + memberships');
  return members;
}

async function seedSportsAndCourts(location, taxes) {
  const tax18 = taxes.find((t) => t.ratePct === 18) || taxes[0];
  const sportSpecs = [
    { key: 'tennis', name: 'Tennis', icon: 'ri-tennis-ball-line' },
    { key: 'padel', name: 'Padel', icon: 'ri-ping-pong-line' },
    { key: 'badminton', name: 'Badminton', icon: 'ri-football-line' },
    { key: 'cricket', name: 'Cricket nets', icon: 'ri-baseball-line' },
  ];

  const sports = [];
  for (const s of sportSpecs) {
    const doc = await Sport.findOneAndUpdate(
      { key: s.key, isDemo: true },
      {
        ...s,
        sessionMinutes: 60,
        slotStepMinutes: 30,
        active: true,
        isDemo: true,
      },
      { upsert: true, new: true },
    );
    sports.push(doc);
  }

  const peakWindows = [{ dow: [1, 2, 3, 4, 5], from: '17:00', to: '22:00' }];
  const courtSpecs = [
    { sportKey: 'tennis', name: 'Tennis Court 1', code: 'T1', walkPeak: 120000, walkOff: 80000 },
    { sportKey: 'tennis', name: 'Tennis Court 2', code: 'T2', walkPeak: 120000, walkOff: 80000 },
    { sportKey: 'padel', name: 'Padel Court 1', code: 'P1', walkPeak: 140000, walkOff: 90000 },
    { sportKey: 'padel', name: 'Padel Court 2', code: 'P2', walkPeak: 140000, walkOff: 90000 },
    { sportKey: 'badminton', name: 'Badminton Court 1', code: 'B1', walkPeak: 80000, walkOff: 50000 },
    { sportKey: 'badminton', name: 'Badminton Court 2', code: 'B2', walkPeak: 80000, walkOff: 50000 },
    { sportKey: 'cricket', name: 'Cricket Net 1', code: 'C1', walkPeak: 100000, walkOff: 70000 },
  ];

  const courts = [];
  for (const c of courtSpecs) {
    const sport = sports.find((s) => s.key === c.sportKey);
    const doc = await Court.findOneAndUpdate(
      { code: c.code, isDemo: true },
      {
        sportId: sport._id,
        locationId: location._id,
        name: c.name,
        code: c.code,
        surface: 'synthetic',
        indoor: c.sportKey !== 'tennis',
        floodlit: true,
        status: 'active',
        operatingHours: [],
        pricing: {
          walkInPaise: { peak: c.walkPeak, offPeak: c.walkOff },
          memberBasePaise: {
            peak: Math.round(c.walkPeak * 0.8),
            offPeak: Math.round(c.walkOff * 0.8),
          },
          peakWindows,
        },
        taxId: tax18?._id || null,
        allowSocialPlay: true,
        capacity: c.sportKey === 'padel' ? 4 : 4,
        isDemo: true,
      },
      { upsert: true, new: true },
    );
    courts.push(doc);
  }

  logger.info({ sports: sports.length, courts: courts.length }, 'seeded sports + courts');
  return { sports, courts };
}

async function seedSampleBooking(courts, members) {
  const tennis = courts.find((c) => c.code === 'T1') || courts[0];
  const member = members?.[0];
  if (!tennis) return null;

  const today = toLocalDate();
  const existing = await Booking.findOne({
    courtId: tennis._id,
    localDate: today,
    isDemo: true,
    status: { $nin: ['cancelled'] },
  });
  if (existing) {
    logger.info({ bookingNo: existing.bookingNo }, 'sample booking already present');
    return existing;
  }

  // Book a mid-afternoon slot so the board has something visible
  const startUtc = localDateTimeToUtc(today, '16:00');
  // Skip if that slot already started more than 2h ago (avoid past-slot failures)
  if (startUtc.getTime() < Date.now() - 2 * 60 * 60 * 1000) {
    const tomorrow = toLocalDate(addMinutesUtc(localDateTimeToUtc(today, '12:00'), 24 * 60));
    const startTomorrow = localDateTimeToUtc(tomorrow, '16:00');
    try {
      const booking = await createBooking(
        {
          courtId: String(tennis._id),
          startUtc: startTomorrow,
          type: member ? 'member' : 'walk_in',
          memberId: member ? String(member._id) : undefined,
          bookedByMemberId: member ? String(member._id) : undefined,
          customer: member
            ? undefined
            : { name: 'Walk-in Demo', phone: '9999900001' },
          channel: 'front_desk',
          paymentMode: 'cash',
          isDemo: true,
        },
        { user: { id: 'seed', name: 'seed' } },
      );
      logger.info({ bookingNo: booking.bookingNo }, 'seeded sample booking');
      return booking;
    } catch (err) {
      logger.warn({ err: err?.message }, 'sample booking skipped');
      return null;
    }
  }

  try {
    const booking = await createBooking(
      {
        courtId: String(tennis._id),
        startUtc,
        type: member ? 'member' : 'walk_in',
        memberId: member ? String(member._id) : undefined,
        bookedByMemberId: member ? String(member._id) : undefined,
        customer: member
          ? undefined
          : { name: 'Walk-in Demo', phone: '9999900001' },
        channel: 'front_desk',
        paymentMode: 'cash',
        isDemo: true,
      },
      { user: { id: 'seed', name: 'seed' } },
    );
    logger.info({ bookingNo: booking.bookingNo }, 'seeded sample booking');
    return booking;
  } catch (err) {
    logger.warn({ err: err?.message }, 'sample booking skipped');
    return null;
  }
}

async function seedTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    await NotificationTemplate.findOneAndUpdate(
      { key: t.key },
      { ...t, isDemo: true },
      { upsert: true, new: true },
    );
  }
  logger.info({ count: DEFAULT_TEMPLATES.length }, 'seeded notification templates');
}

async function main() {
  const reset = process.argv.includes('--reset');
  await connectDb();

  if (reset) {
    await resetDemo();
  }

  await seedClub();
  const location = await Location.findOne({ code: 'MAIN' });
  const taxes = await seedTaxes();
  const customers = await seedCustomers();
  await seedSampleInvoice(customers, taxes, location);
  const plans = await seedMembershipPlans(taxes);
  const members = await seedMembersAndMemberships(plans);
  const extraMembers = await seedExtraMembers(plans);
  const allMembers = [...members, ...extraMembers];
  const extraCustomers = await seedExtraCustomers();
  const allCustomers = [...customers, ...extraCustomers];
  await seedExtraInvoices(allCustomers, taxes, location);
  const { courts } = await seedSportsAndCourts(location, taxes);
  await seedSampleBooking(courts, allMembers);
  await seedExtraBookings(courts, allMembers);
  await seedExtraLeads();
  await seedMenus();
  await seedBlogs();
  await seedTemplates();
  await seedArambhRoles();

  await audit.record({
    actor: { type: 'system', name: 'seed' },
    source: 'system',
    action: 'seed.demo',
    entity: { type: 'clubSettings', id: 'default', label: 'Arambh Sports Arena' },
    after: {
      clubName: 'Aarambh Sports Arena',
      roles: ['owner', 'manager', 'front_desk', 'bar_staff', 'finance'],
      phase4: ['location', 'taxes', 'customers', 'sampleInvoice'],
      phase5: ['plans', 'members', 'memberships'],
      phase6: ['sports', 'courts', 'sampleBooking'],
      phase7: ['frontDesk'],
      menus: true,
      volume: true,
    },
  });

  logger.info('seed complete');
  await disconnectDb();
}

main().catch(async (err) => {
  logger.error({ err }, 'seed failed');
  try {
    await disconnectDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
