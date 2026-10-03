import { Settings } from '../settings/settings.model.js';
import { Location } from '../settings/location.model.js';
import { Sport } from '../facilities/sport.model.js';
import { Court } from '../facilities/court.model.js';
import { MembershipPlan } from '../membership/plan.model.js';
import { Lead } from './lead.model.js';
import { getAvailability } from '../booking/availability.service.js';
import * as BookingService from '../booking/booking.service.js';
import { nextNumber } from '../../lib/counters.js';
import { toLocalDate } from '../../lib/time.js';
import { audit } from '../audit/audit.service.js';
import { Validation } from '../../lib/errors.js';

const PUBLIC_SLOT_STATUS = new Set([
  'available',
  'past',
  'held',
  'blocked',
  'social',
  'booked',
]);

function actorPublic(_ctx = {}) {
  return { type: 'system', name: 'website visitor' };
}

function slaDueAt(from = new Date(), hours = 2) {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

function normalizeInterest(interest) {
  if (!interest) return [];
  return (Array.isArray(interest) ? interest : [interest])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * Public club profile — settings + primary location (no secrets).
 */
export async function getClub() {
  let settings = await Settings.findOne({ locationId: null }).lean();
  if (!settings) {
    settings = (
      await Settings.create({
        locationId: null,
        clubName: 'Arambh Sports Arena',
        currency: 'INR',
      })
    ).toObject();
  }

  const location =
    (await Location.findOne({ code: 'MAIN', archivedAt: null }).lean()) ||
    (await Location.findOne({ archivedAt: null }).sort({ createdAt: 1 }).lean());

  return {
    name: settings.clubName || 'Arambh Sports Arena',
    currency: settings.currency || 'INR',
    trialPricePaise: settings.trialPricePaise ?? 0,
    maxAdvanceDays: settings.maxAdvanceDays ?? 14,
    location: location
      ? {
          name: location.name,
          code: location.code,
          address: location.address || '',
          phone: location.phone || '',
          timezone: location.timezone || 'Asia/Kolkata',
          openingHours: location.openingHours || [],
        }
      : null,
  };
}

/**
 * Active sports with court counts (no pricing internals).
 */
export async function listSportsPublic() {
  const sports = await Sport.find({ active: true }).sort({ name: 1 }).lean();
  const courtCounts = await Court.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$sportId', count: { $sum: 1 } } },
  ]);
  const countBySport = Object.fromEntries(
    courtCounts.map((r) => [String(r._id), r.count]),
  );

  return sports.map((s) => ({
    id: String(s._id),
    key: s.key,
    name: s.name,
    icon: s.icon || '',
    sessionMinutes: s.sessionMinutes || 60,
    slotStepMinutes: s.slotStepMinutes || 30,
    courtCount: countBySport[String(s._id)] || 0,
  }));
}

/**
 * Public membership plan cards (latest active version per key).
 */
export async function listMembershipPlansPublic() {
  const plans = await MembershipPlan.find({
    active: true,
    archivedAt: null,
  })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  // Prefer highest version per key for public cards
  const byKey = new Map();
  for (const p of plans) {
    const prev = byKey.get(p.key);
    if (!prev || (p.version || 1) > (prev.version || 1)) byKey.set(p.key, p);
  }

  return [...byKey.values()]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((p) => ({
      id: String(p._id),
      key: p.key,
      name: p.name,
      description: p.description || '',
      colour: p.colour || '#0F7A4A',
      durations: (p.durations || []).map((d) => ({
        months: d.months,
        pricePaise: d.pricePaise,
      })),
      entitlements: {
        court: {
          access: p.entitlements?.court?.access || 'all',
          maxBookingsPerDay: p.entitlements?.court?.maxBookingsPerDay ?? 2,
          advanceBookingDays: p.entitlements?.court?.advanceBookingDays ?? 14,
          sportKeys: p.entitlements?.court?.sportKeys || [],
        },
        shopDiscountPct: p.entitlements?.shopDiscountPct ?? 0,
        barDiscountPct: p.entitlements?.barDiscountPct ?? 0,
        guestPasses: p.entitlements?.guestPasses ?? 0,
        perks: p.entitlements?.perks || [],
      },
      eligibility: p.eligibility || {},
    }));
}

/**
 * Free/busy only — never member names or booking PII.
 */
export async function getPublicAvailability({ localDate, sportId, days = 1 }) {
  const dayCount = Math.min(Math.max(Number(days) || 1, 1), 14);
  const dates = [];
  const base = new Date(`${localDate}T12:00:00.000Z`);
  for (let i = 0; i < dayCount; i += 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  const daysOut = [];
  for (const date of dates) {
    const raw = await getAvailability({
      localDate: date,
      sportId: sportId || undefined,
      publicOnly: true,
    });

    daysOut.push({
      localDate: date,
      courts: (raw.courts || []).map((c) => ({
        courtId: c.courtId,
        code: c.code,
        sportId: c.sportId,
        sportKey: c.sportKey,
        slots: (c.slots || []).map((slot) => {
          const status = PUBLIC_SLOT_STATUS.has(slot.status) ? slot.status : 'booked';
          // Collapse occupied states to busy for public consumers that only need free/busy
          const busy =
            status !== 'available' && status !== 'past'
              ? 'busy'
              : status === 'past'
                ? 'past'
                : 'free';
          return {
            start: slot.start,
            end: slot.end,
            status: busy === 'free' ? 'available' : busy === 'past' ? 'past' : 'busy',
          };
        }),
      })),
    });
  }

  return dayCount === 1 ? daysOut[0] : { days: daysOut };
}

async function createLeadDoc(
  {
    name,
    phone,
    email,
    message,
    interest,
    source,
    stage,
    companyName,
    isDemo,
    trialBookingId,
    trialRequest,
  },
  ctx = {},
) {
  const year = new Date().getUTCFullYear();
  const leadNo = await nextNumber(`lead:${year}`, `LD-${year}-{SEQ:5}`);
  const now = new Date();

  const doc = await Lead.create({
    leadNo,
    name,
    phone,
    email: email || '',
    message: message || '',
    interest: normalizeInterest(interest),
    source,
    stage: stage || 'new',
    companyName: companyName || '',
    slaDueAt: slaDueAt(now, 2),
    trialBookingId: trialBookingId || null,
    trialRequest: trialRequest || undefined,
    isDemo: Boolean(isDemo),
  });

  await audit.record({
    actor: actorPublic(ctx),
    source: 'website',
    action: source === 'trial_booking' ? 'lead.trial_created' : 'lead.enquiry_created',
    entity: { type: 'lead', id: String(doc._id), label: leadNo },
    after: {
      leadNo,
      source,
      stage: doc.stage,
      interest: doc.interest,
      phone: '[redacted-in-audit-summary]',
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

/**
 * Contact / general enquiry → lead.
 */
export async function createEnquiry(input, ctx = {}) {
  if (input.website) {
    throw Validation([{ path: 'website', message: 'Invalid submission' }]);
  }

  const lead = await createLeadDoc(
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      interest: input.interest,
      source: 'website_form',
      stage: 'new',
      companyName: input.companyName,
      isDemo: input.isDemo,
    },
    ctx,
  );

  return {
    leadNo: lead.leadNo,
    id: String(lead._id),
    stage: lead.stage,
    message: 'Thanks — we received your enquiry and will follow up shortly.',
  };
}

/**
 * Trial request → lead (+ optional BookingService trial booking).
 */
export async function createTrial(input, ctx = {}) {
  if (input.website) {
    throw Validation([{ path: 'website', message: 'Invalid submission' }]);
  }

  let booking = null;
  let bookingError = null;
  const trialRequest = {
    sportId: input.sportId || null,
    courtId: input.courtId || null,
    startUtc: input.startUtc || null,
    localDate: input.localDate || (input.startUtc ? toLocalDate(input.startUtc) : ''),
    note: '',
  };

  if (input.courtId && input.startUtc) {
    try {
      booking = await BookingService.create(
        {
          courtId: input.courtId,
          startUtc: input.startUtc,
          type: 'trial',
          channel: 'website',
          customer: {
            name: input.name,
            phone: input.phone,
          },
          payment: { mode: 'free' },
          notes: input.message || 'Website trial request',
          isDemo: Boolean(input.isDemo),
        },
        {
          source: 'website',
          requestId: ctx.requestId,
          user: { name: input.name },
        },
      );
    } catch (err) {
      bookingError = err?.code || err?.message || 'BOOKING_FAILED';
      trialRequest.note = `Booking deferred: ${bookingError}`;
    }
  } else {
    trialRequest.note = 'Stub trial request — staff will confirm a slot';
  }

  const stage = booking ? 'trial_scheduled' : 'new';
  const lead = await createLeadDoc(
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      interest: input.interest?.length ? input.interest : ['trial'],
      source: 'trial_booking',
      stage,
      isDemo: input.isDemo,
      trialBookingId: booking?._id || null,
      trialRequest: booking ? undefined : trialRequest,
    },
    ctx,
  );

  // Attach trialRequest even when booking succeeded for sport preference
  if (booking && (input.sportId || input.localDate)) {
    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          trialRequest: {
            sportId: input.sportId || null,
            courtId: input.courtId || null,
            startUtc: input.startUtc || null,
            localDate: input.localDate || toLocalDate(input.startUtc),
            note: 'Confirmed via BookingService',
          },
        },
      },
    );
  }

  return {
    leadNo: lead.leadNo,
    id: String(lead._id),
    stage,
    booking: booking
      ? {
          id: String(booking._id),
          bookingNo: booking.bookingNo,
          status: booking.status,
          start: booking.start,
          end: booking.end,
          localDate: booking.localDate,
        }
      : null,
    pendingConfirmation: !booking,
    message: booking
      ? 'Your trial is booked. See you on court!'
      : 'Thanks — we received your trial request and will confirm a slot shortly.',
  };
}

export default {
  getClub,
  listSportsPublic,
  listMembershipPlansPublic,
  getPublicAvailability,
  createEnquiry,
  createTrial,
};
