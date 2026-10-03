/**
 * Extra demo volume — members, bookings, invoices, leads — for a full dashboard.
 */
import { logger } from '../lib/logger.js';
import { Member } from '../modules/members/member.model.js';
import { Membership } from '../modules/membership/membership.model.js';
import { register as registerMember } from '../modules/members/member.service.js';
import { purchase as purchaseMembership } from '../modules/membership/membership.service.js';
import { Customer } from '../modules/customers/customer.model.js';
import { createAndPost } from '../modules/finance/invoice.service.js';
import { create as createBooking } from '../modules/booking/booking.service.js';
import { Booking } from '../modules/booking/booking.model.js';
import { Lead } from '../modules/public/lead.model.js';
import { nextNumber } from '../lib/counters.js';
import { Invoice } from '../modules/finance/invoice.model.js';
import { toLocalDate, localDateTimeToUtc } from '../lib/time.js';

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Pranav', 'Advait', 'Dhruv',
  'Ananya', 'Aadhya', 'Diya', 'Myra', 'Sara', 'Ira', 'Aarohi', 'Kiara',
  'Navya', 'Pari', 'Riya', 'Saanvi', 'Tara', 'Meera', 'Isha',
];
const LAST = [
  'Patel', 'Shah', 'Mehta', 'Desai', 'Joshi', 'Trivedi', 'Raval', 'Amin',
  'Gandhi', 'Parekh', 'Dave', 'Bhatt', 'Modi', 'Chauhan', 'Solanki',
];

function pick(arr, i) {
  return arr[i % arr.length];
}

export async function seedExtraMembers(plans) {
  const gold = plans.find((p) => p.key === 'gold');
  const silver = plans.find((p) => p.key === 'silver');
  const junior = plans.find((p) => p.key === 'junior');
  const planCycle = [gold, silver, gold, silver, junior, silver, gold];
  const ctx = { source: 'system', user: { name: 'seed' } };
  const members = [];

  for (let i = 0; i < 28; i += 1) {
    const firstName = pick(FIRST, i);
    const lastName = pick(LAST, i + 3);
    const phone = `98765${String(10000 + i).slice(-5)}`;
    const email = `demo.member${i + 1}@arambh.test`;
    const plan = planCycle[i % planCycle.length];
    const isJunior = plan?.key === 'junior';
    const dob = isJunior
      ? `201${i % 8}-0${(i % 9) + 1}-15`
      : `198${i % 10}-0${(i % 9) + 1}-12`;

    let member = await Member.findOne({ email, isDemo: true });
    if (!member) {
      try {
        member = await registerMember(
          {
            firstName,
            lastName,
            phone,
            email,
            dob,
            source: 'front_desk',
            isDemo: true,
            guardian: isJunior
              ? { name: `${lastName} Guardian`, phone: `98665${String(10000 + i).slice(-5)}`, relation: 'parent' }
              : undefined,
          },
          ctx,
        );
      } catch (err) {
        logger.warn({ email, err: err?.message }, 'extra member skipped');
        continue;
      }
    } else {
      member = member.toObject ? member.toObject() : member;
    }

    const existingMs = await Membership.findOne({
      memberId: member._id,
      status: { $in: ['active', 'scheduled'] },
      isDemo: true,
    });
    if (!existingMs && plan) {
      try {
        if (i % 7 === 0) {
          // Expiring soon
          const today = toLocalDate();
          const endLocal = (() => {
            const noon = localDateTimeToUtc(today, '12:00');
            return toLocalDate(new Date(noon.getTime() + ((i % 5) + 2) * 86400000));
          })();
          const startLocal = (() => {
            const noon = localDateTimeToUtc(endLocal, '12:00');
            return toLocalDate(new Date(noon.getTime() - 28 * 86400000));
          })();
          const pricePaise =
            plan.durations?.find((d) => d.months === 1)?.pricePaise ||
            plan.durations?.[0]?.pricePaise ||
            0;
          await Membership.create({
            memberId: member._id,
            planId: plan._id,
            planKey: plan.key,
            planVersion: plan.version || 1,
            entitlementsSnapshot: plan.entitlements,
            startDate: localDateTimeToUtc(startLocal, '00:00'),
            endDate: localDateTimeToUtc(endLocal, '23:59'),
            startLocalDate: startLocal,
            endLocalDate: endLocal,
            status: 'active',
            pricePaise,
            durationMonths: 1,
            isDemo: true,
          });
          await Member.updateOne(
            { _id: member._id },
            { status: 'active', tierKey: plan.key },
          );
        } else {
          await purchaseMembership(
            {
              memberId: String(member._id),
              planId: String(plan._id),
              months: plan.key === 'gold' ? 12 : 3,
              payment: { mode: 'cash' },
              isDemo: true,
            },
            ctx,
          );
        }
      } catch (err) {
        logger.warn({ email, err: err?.message }, 'extra membership skipped');
      }
    }
    members.push(member);
  }

  logger.info({ count: members.length }, 'seeded extra demo members');
  return members;
}

export async function seedExtraCustomers() {
  const specs = [];
  for (let i = 0; i < 12; i += 1) {
    specs.push({
      phone: `97654${String(20000 + i).slice(-5)}`,
      email: `demo.customer${i + 1}@arambh.test`,
      type: i % 4 === 0 ? 'company' : 'person',
      name: i % 4 === 0 ? `${pick(LAST, i)} Sports Club` : `${pick(FIRST, i + 5)} ${pick(LAST, i + 2)}`,
      tags: i % 4 === 0 ? ['b2b'] : ['walk-in'],
    });
  }
  const out = [];
  for (const s of specs) {
    const doc = await Customer.findOneAndUpdate(
      { email: s.email, isDemo: true },
      { ...s, isDemo: true, archivedAt: null },
      { upsert: true, new: true },
    );
    out.push(doc);
  }
  logger.info({ count: out.length }, 'seeded extra customers');
  return out;
}

export async function seedExtraInvoices(customers, taxes, location) {
  if (!customers?.length) return [];
  const tax = taxes?.[0];
  const out = [];
  for (let i = 0; i < 10; i += 1) {
    const customer = customers[i % customers.length];
    const amount = 150000 + i * 25000;
    try {
      const existing = await Invoice.findOne({
        notes: `Seed volume invoice #${i + 1}`,
        isDemo: true,
      });
      if (existing) {
        out.push(existing);
        continue;
      }
      const invoice = await createAndPost(
        {
          customerId: String(customer._id),
          locationId: location ? String(location._id) : undefined,
          sourceType: 'manual',
          lines: [
            {
              description: i % 2 === 0 ? 'Court hire package' : 'Membership instalment',
              revenueStream: i % 2 === 0 ? 'court' : 'membership',
              qty: 1,
              unitPricePaise: amount,
              discountPct: 0,
              taxId: tax ? String(tax._id) : undefined,
            },
          ],
          notes: `Seed volume invoice #${i + 1}`,
          post: true,
          isDemo: true,
        },
        { source: 'system', user: { name: 'seed' } },
      );
      out.push(invoice);
    } catch (err) {
      logger.warn({ i, err: err?.message }, 'extra invoice skipped');
    }
  }
  logger.info({ count: out.length }, 'seeded extra invoices');
  return out;
}

export async function seedExtraBookings(courts, members) {
  if (!courts?.length) return [];
  const ctx = { user: { id: 'seed', name: 'seed' } };
  const today = toLocalDate();
  let created = 0;

  for (let dayOffset = -3; dayOffset <= 4; dayOffset += 1) {
    const noon = localDateTimeToUtc(today, '12:00');
    const localDate = toLocalDate(new Date(noon.getTime() + dayOffset * 86400000));
    for (let slot = 0; slot < 3; slot += 1) {
      const court = courts[(dayOffset + slot + 3) % courts.length];
      const hour = 8 + slot * 3 + ((dayOffset + 5) % 2);
      const startUtc = localDateTimeToUtc(localDate, `${String(hour).padStart(2, '0')}:00`);
      // skip past collisions lightly
      const exists = await Booking.findOne({
        courtId: court._id,
        start: startUtc,
        isDemo: true,
      }).lean();
      if (exists) continue;

      const member = members?.length ? members[(slot + dayOffset + 10) % members.length] : null;
      try {
        await createBooking(
          {
            courtId: String(court._id),
            startUtc,
            type: member ? 'member' : 'walk_in',
            memberId: member ? String(member._id) : undefined,
            bookedByMemberId: member ? String(member._id) : undefined,
            customer: member
              ? undefined
              : { name: `Walk-in ${localDate}-${slot}`, phone: `99999${String(10000 + Math.abs(dayOffset * 3 + slot)).slice(-5)}` },
            channel: 'front_desk',
            paymentMode: slot % 2 === 0 ? 'cash' : 'free',
            isDemo: true,
            idempotencyKey: `seed-vol-${localDate}-${court._id}-${hour}`,
          },
          ctx,
        );
        created += 1;
      } catch (err) {
        logger.warn({ localDate, hour, err: err?.message }, 'extra booking skipped');
      }
    }
  }

  // A couple of cancelled / completed for chart variety
  const recent = await Booking.find({ isDemo: true }).sort({ createdAt: -1 }).limit(4).lean();
  if (recent[0]) {
    await Booking.updateOne({ _id: recent[0]._id }, { status: 'completed' });
  }
  if (recent[1]) {
    await Booking.updateOne(
      { _id: recent[1]._id },
      { status: 'cancelled', cancellation: { reason: 'Demo cancel', at: new Date() } },
    );
  }

  logger.info({ created }, 'seeded extra bookings');
  return created;
}

export async function seedExtraLeads() {
  const year = new Date().getUTCFullYear();
  const specs = [
    { name: 'Neha Kapoor', phone: '9811100001', interest: ['trial', 'Tennis'], source: 'website_form', stage: 'new' },
    { name: 'Rohan Iyer', phone: '9811100002', interest: ['membership', 'Padel'], source: 'trial_booking', stage: 'trial_scheduled' },
    { name: 'Corporate — L&T', phone: '9811100003', interest: ['corporate'], source: 'phone', stage: 'quoted', companyName: 'L&T Vadodara' },
    { name: 'Simran Gill', phone: '9811100004', interest: ['trial', 'Badminton'], source: 'website_form', stage: 'contacted' },
    { name: 'Dev Joshi', phone: '9811100005', interest: ['membership'], source: 'walk_in', stage: 'new' },
    { name: 'Pooja Nair', phone: '9811100006', interest: ['coaching'], source: 'referral', stage: 'new' },
    { name: 'Harsh Vora', phone: '9811100007', interest: ['trial', 'Cricket'], source: 'website_form', stage: 'trial_done' },
    { name: 'Ankit Bose', phone: '9811100008', interest: ['membership', 'Gold'], source: 'ai_chat', stage: 'contacted' },
  ];

  let count = 0;
  for (const s of specs) {
    const existing = await Lead.findOne({ phone: s.phone, isDemo: true });
    if (existing) {
      count += 1;
      continue;
    }
    const leadNo = await nextNumber(`lead:${year}`, `LD-${year}-{SEQ:5}`);
    await Lead.create({
      leadNo,
      name: s.name,
      phone: s.phone,
      email: `${s.name.toLowerCase().replace(/[^a-z]/g, '.')}@demo.arambh.test`,
      interest: s.interest,
      source: s.source,
      stage: s.stage,
      message: 'Seeded demo lead for dashboard / CRM',
      companyName: s.companyName || '',
      slaDueAt: new Date(Date.now() + 2 * 3600 * 1000),
      isDemo: true,
    });
    count += 1;
  }
  logger.info({ count }, 'seeded extra leads');
  return count;
}

export default {
  seedExtraMembers,
  seedExtraCustomers,
  seedExtraInvoices,
  seedExtraBookings,
  seedExtraLeads,
};
