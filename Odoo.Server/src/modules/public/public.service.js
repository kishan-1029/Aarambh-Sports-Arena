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
import { AppError, Validation } from '../../lib/errors.js';
import { benefitLinesForPlan } from '../membership/benefitLines.js';
import { emailForEnquiry } from '../mail/transactionalMail.js';
import Faq from '../../../models/Faq.js';
import FaqCategory from '../../../models/FaqCategory.js';

async function getPublicSettings() {
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
  return settings;
}

function assertPublicFeature(settings, flag, label) {
  if (settings.publicSiteEnabled === false) {
    throw new AppError('SITE_DISABLED', 'Public website is temporarily disabled', 403);
  }
  if (flag && settings[flag] === false) {
    throw new AppError('FEATURE_DISABLED', `${label} is not available`, 403);
  }
}

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
  const settings = await getPublicSettings();

  const location =
    (await Location.findOne({ code: 'MAIN', archivedAt: null }).lean()) ||
    (await Location.findOne({ archivedAt: null }).sort({ createdAt: 1 }).lean());

  return {
    name: settings.clubName || 'Arambh Sports Arena',
    currency: settings.currency || 'INR',
    trialPricePaise: settings.trialPricePaise ?? 0,
    maxAdvanceDays: settings.maxAdvanceDays ?? 14,
    features: {
      publicSiteEnabled: settings.publicSiteEnabled !== false,
      showMembershipPlans: settings.showMembershipPlans !== false,
      showSports: settings.showSports !== false,
      showAvailability: settings.showAvailability !== false,
      showBlogs: settings.showBlogs !== false,
      showTrial: settings.showTrial !== false,
      showContact: settings.showContact !== false,
      showShop: settings.showShop !== false,
    },
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
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showSports', 'Sports');
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
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showMembershipPlans', 'Membership plans');
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
          pricing: p.entitlements?.court?.pricing || {},
          maxBookingsPerDay: p.entitlements?.court?.maxBookingsPerDay ?? 2,
          advanceBookingDays: p.entitlements?.court?.advanceBookingDays ?? 14,
          sportKeys: p.entitlements?.court?.sportKeys || [],
        },
        shopDiscountPct: p.entitlements?.shopDiscountPct ?? 0,
        barDiscountPct: p.entitlements?.barDiscountPct ?? 0,
        guestPasses: p.entitlements?.guestPasses ?? 0,
        // Prefer admin-authored perk lines; fall back to derived benefit lines
        perks:
          (p.entitlements?.perks || []).length > 0
            ? p.entitlements.perks
            : benefitLinesForPlan(p.entitlements, []),
      },
      benefits: benefitLinesForPlan(p.entitlements, p.entitlements?.perks || []),
      eligibility: p.eligibility || {},
    }));
}

/**
 * Active FAQs grouped by category for the public website.
 */
export async function listFaqsPublic() {
  const categories = await FaqCategory.find({ isActive: true })
    .sort({ sequence: 1, categoryName: 1 })
    .lean();
  const faqs = await Faq.find({ isActive: true })
    .sort({ sequence: 1, createdAt: 1 })
    .lean();

  const byCat = new Map();
  for (const c of categories) {
    byCat.set(String(c._id), {
      _id: String(c._id),
      name: c.categoryName,
      description: c.description || '',
      faqs: [],
    });
  }
  for (const f of faqs) {
    const key = String(f.category);
    let bucket = byCat.get(key);
    if (!bucket) {
      bucket = { _id: key, name: 'General', description: '', faqs: [] };
      byCat.set(key, bucket);
    }
    bucket.faqs.push({
      _id: String(f._id),
      question: f.question,
      answer: f.answer,
      sequence: f.sequence || 0,
    });
  }

  return {
    categories: [...byCat.values()].filter((c) => c.faqs.length > 0),
  };
}

/**
 * Free/busy only — never member names or booking PII.
 */
export async function getPublicAvailability({ localDate, sportId, days = 1 }) {
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showAvailability', 'Availability');
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
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showContact', 'Contact');
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

  // Fire-and-forget thank-you email (never blocks the enquiry response)
  if (input.email) {
    void emailForEnquiry({
      name: input.name,
      email: input.email,
      interest: input.interest,
      message: input.message,
      leadNo: lead.leadNo,
    });
  }

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
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showTrial', 'Trial booking');
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

/**
 * Published blogs for the public site (active + Published only).
 */
export async function listBlogsPublic({ limit = 12 } = {}) {
  const settings = await getPublicSettings();
  assertPublicFeature(settings, 'showBlogs', 'Blogs');

  let BlogMaster;
  try {
    BlogMaster = (await import('../../../models/BlogMaster.js')).default;
  } catch {
    return [];
  }

  const rows = await BlogMaster.find({
    isActive: true,
    status: 'Published',
  })
    .sort({ publishDate: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 12, 50))
    .lean();

  return rows.map((b) => ({
    id: String(b._id),
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt || '',
    featuredImage: b.featuredImage || '',
    featuredImageAlt: b.featuredImageAlt || b.title,
    category: b.category || '',
    tags: b.tags || [],
    author: b.author || 'Arambh',
    publishDate: b.publishDate,
    readingTime: b.readingTime || 3,
    isFeatured: Boolean(b.isFeatured),
  }));
}

export default {
  getClub,
  listBlogsPublic,
  listSportsPublic,
  listMembershipPlansPublic,
  listFaqsPublic,
  getPublicAvailability,
  createEnquiry,
  createTrial,
};
