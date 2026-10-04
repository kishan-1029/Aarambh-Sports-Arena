import { Booking } from './booking.model.js';
import { SlotLock } from './slotLock.model.js';
import { MemberDayCounter } from './memberDayCounter.model.js';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { Location } from '../settings/location.model.js';
import { Settings } from '../settings/settings.model.js';
import { Member } from '../members/member.model.js';
import { Customer } from '../customers/customer.model.js';
import { Invoice } from '../finance/invoice.model.js';
import { Payment } from '../finance/payment.model.js';
import { buildComputedLines, allocateInvoiceNumber, financialYearKey } from '../finance/invoice.service.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { now as clockNow } from '../../lib/clock.js';
import {
  toLocalDate,
  alignToSlot,
  addMinutesUtc,
  localDateTimeToUtc,
  dayRange,
} from '../../lib/time.js';
import { NotFound, Validation, Conflict, AppError } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { entitlementsFor, canBookCourt } from '../membership/entitlements.js';
import { recordActivity } from '../membership/activity.consumer.js';
import { courtPrice, isPeak } from './pricing.service.js';
import { operatingWindow, sessionUnits } from './availability.service.js';
import { translateLockError, findAlternatives } from './conflictGuard.js';

const DESK_METHODS = new Set(['cash', 'card', 'upi', 'mock', 'desk', 'free']);

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) {
    return { type: 'system', name: ctx?.user?.name || 'system' };
  }
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

async function captureDeskPayment(invoice, method, session, ctx, isDemo) {
  const fy = financialYearKey();
  const paymentNo = await nextNumber(`payment:${fy}`, `PAY/${fy}/{SEQ:5}`, { session });
  const at = clockNow();
  const amountPaise = invoice.totals.totalPaise;
  const rawMethod = method || 'cash';
  const payMethod = ['mock', 'online', 'desk', 'free'].includes(rawMethod) ? 'cash' : rawMethod;
  const [payment] = await Payment.create(
    [
      {
        paymentNo,
        direction: 'in',
        method: payMethod,
        amountPaise,
        provider: rawMethod === 'mock' ? 'mock' : 'manual',
        status: 'captured',
        invoiceIds: [invoice._id],
        sourceType: 'invoice',
        sourceId: invoice._id,
        receivedBy: ctx?.user?.name || '',
        at,
        localDate: toLocalDate(at),
        isDemo: Boolean(isDemo),
      },
    ],
    { session },
  );
  invoice.totals.paidPaise = amountPaise;
  invoice.totals.duePaise = 0;
  invoice.status = 'paid';
  await invoice.save({ session });
  return payment;
}

function phoneTail(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : '';
}

/**
 * Invoice.customerId is required. Walk-ins and members without a linked
 * customer get one matched by phone/email, or a new person record.
 */
async function ensureCustomerId({ member, customer, isDemo, session }) {
  if (member?.customerId) return member.customerId;
  if (customer?.customerId) return customer.customerId;

  const phone = String(customer?.phone || member?.phone || '').trim();
  const email = String(customer?.email || member?.email || '').trim().toLowerCase();
  const name =
    String(customer?.name || `${member?.firstName || ''} ${member?.lastName || ''}`).trim() ||
    'Walk-in';
  const tail = phoneTail(phone);
  const or = [];
  if (tail) or.push({ phone: new RegExp(`${tail}$`) });
  if (email) or.push({ email });

  if (or.length) {
    const found = await Customer.findOne({ archivedAt: null, $or: or }).session(session);
    if (found) return found._id;
  }

  const payload = {
    type: 'person',
    name,
    phone,
    tags: member ? ['member'] : ['walk-in'],
    isDemo: Boolean(isDemo),
  };
  if (email) payload.email = email;

  const [created] = await Customer.create([payload], { session });
  if (member?._id) {
    await Member.updateOne({ _id: member._id }, { $set: { customerId: created._id } }, { session });
  }
  return created._id;
}

async function createCourtInvoice({ customerId, booking, price, court, session, isDemo }) {
  const { lines, totals } = await buildComputedLines([
    {
      description: `Court booking ${booking.bookingNo}`,
      revenueStream: 'court',
      qty: 1,
      unitPricePaise: price.totalPaise - (price.taxPaise || 0),
      taxId: court.taxId ? String(court.taxId) : undefined,
    },
  ]);
  // Prefer precomputed total when tax-less
  if (!court.taxId) {
    totals.subtotalPaise = price.totalPaise;
    totals.taxPaise = 0;
    totals.totalPaise = price.totalPaise;
    totals.duePaise = price.totalPaise;
    if (lines[0]) {
      lines[0].unitPricePaise = price.totalPaise;
      lines[0].lineTotalPaise = price.totalPaise;
    }
  }
  const number = await allocateInvoiceNumber('customer_invoice', { session });
  const at = clockNow();
  const [invoice] = await Invoice.create(
    [
      {
        number,
        kind: 'customer_invoice',
        customerId,
        sourceType: 'booking',
        sourceId: booking._id,
        lines,
        totals,
        issueDate: at,
        dueDate: at,
        localDate: toLocalDate(at),
        status: 'posted',
        notes: `Booking ${booking.bookingNo}`,
        isDemo: Boolean(isDemo),
      },
    ],
    { session },
  );
  return invoice;
}

/**
 * Create a booking — only path that inserts Booking + SlotLock.
 */
export async function create(input, ctx = {}) {
  const court = await Court.findById(input.courtId).lean();
  if (!court || court.status !== 'active') throw NotFound('Court');

  const sport = await Sport.findById(court.sportId).lean();
  if (!sport || !sport.active) throw NotFound('Sport');

  const sessionMinutes = sport.sessionMinutes || 60;
  const slotStep = sport.slotStepMinutes || 30;
  const startUtc = new Date(input.startUtc);
  const aligned = alignToSlot(startUtc, slotStep);
  if (aligned.getTime() !== startUtc.getTime()) {
    throw Validation([{ path: 'startUtc', message: `Start must align to ${slotStep}-minute slots` }]);
  }

  const endUtc = addMinutesUtc(startUtc, sessionMinutes);
  const units = sessionUnits(startUtc, sessionMinutes, slotStep);
  const localDate = toLocalDate(startUtc);
  const now = clockNow();

  if (startUtc <= now) {
    throw Validation([{ path: 'startUtc', message: 'Cannot book in the past' }]);
  }

  const settings = await Settings.findOne({ locationId: null }).lean();
  const maxAdvance = settings?.maxAdvanceDays ?? 14;
  const holdMinutes = settings?.holdMinutes ?? 10;

  const loc = court.locationId
    ? await Location.findById(court.locationId).lean()
    : await Location.findOne({ code: 'MAIN' }).lean();
  const window = operatingWindow(court, loc, localDate);
  if (!window) throw Conflict('OUTSIDE_HOURS', 'Court is closed on this day');
  const openUtc = localDateTimeToUtc(localDate, window.open);
  const closeUtc = localDateTimeToUtc(localDate, window.close);
  if (startUtc < openUtc || endUtc > closeUtc) {
    throw Conflict('OUTSIDE_HOURS', 'Booking is outside operating hours');
  }

  let member = null;
  let entitlements = null;
  const memberId = input.memberId || input.bookedByMemberId || null;
  if (memberId) {
    member = await Member.findById(memberId).lean();
    if (!member || member.archivedAt) throw NotFound('Member');
    entitlements = await entitlementsFor(String(member._id), startUtc);
    const advanceDays = entitlements?.court?.advanceBookingDays ?? maxAdvance;
    const maxDate = toLocalDate(addMinutesUtc(now, advanceDays * 24 * 60));
    if (localDate > maxDate) {
      throw Conflict('ADVANCE_WINDOW', `Can book at most ${advanceDays} days ahead`);
    }
    const peak = isPeak(court, startUtc);
    const check = canBookCourt(entitlements, { sportKey: sport.key, isPeak: peak }, startUtc);
    if (!check.ok) {
      throw new AppError(check.code || 'ENTITLEMENT_DENIED', 'Not allowed to book this slot', 422, check);
    }
  } else {
    const maxDate = toLocalDate(addMinutesUtc(now, maxAdvance * 24 * 60));
    if (localDate > maxDate) {
      throw Conflict('ADVANCE_WINDOW', `Walk-ins can book at most ${maxAdvance} days ahead`);
    }
  }

  const type = input.type || (memberId ? 'member' : 'walk_in');
  const price = await courtPrice({
    court,
    startUtc,
    entitlements: memberId ? entitlements : null,
    type,
    overridePaise: input.priceOverridePaise ?? null,
  });

  const paymentMode = input.payment?.mode || input.paymentMode || 'desk';
  const isHold = paymentMode === 'online' && price.totalPaise > 0;
  const isFree = price.totalPaise === 0 || paymentMode === 'free';
  const status = isHold ? 'held' : 'confirmed';
  const holdExpiresAt = isHold ? addMinutesUtc(now, holdMinutes) : null;

  let paymentStatus = 'unpaid';
  if (isFree) paymentStatus = 'not_required';
  else if (isHold) paymentStatus = 'unpaid';
  else if (DESK_METHODS.has(paymentMode)) paymentStatus = paymentMode === 'desk' ? 'pay_at_desk' : 'paid';

  const maxPerDay = entitlements?.court?.maxBookingsPerDay ?? 2;
  const idempotencyKey = input.idempotencyKey || null;

  if (idempotencyKey) {
    const existing = await Booking.findOne({ idempotencyKey }).lean();
    if (existing) return existing;
  }

  // Ensure day-counter doc exists outside txn (idempotent upsert)
  if (memberId) {
    await MemberDayCounter.updateOne(
      { memberId: member._id, localDate },
      { $setOnInsert: { count: 0 } },
      { upsert: true },
    );
  }

  let booking;
  try {
    booking = await withTransaction(async (session) => {
      await SlotLock.deleteMany(
        {
          courtId: court._id,
          slotStart: { $in: units },
          kind: 'hold',
          expiresAt: { $lt: now },
        },
        { session },
      );

      if (memberId) {
        const r = await MemberDayCounter.findOneAndUpdate(
          { memberId: member._id, localDate, count: { $lt: maxPerDay } },
          { $inc: { count: 1 } },
          { new: true, session },
        );
        if (!r) {
          throw Conflict(
            'DAILY_LIMIT_REACHED',
            `You already have ${maxPerDay} bookings on ${localDate}.`,
          );
        }
      }

      const year = now.getUTCFullYear();
      const bookingNo = await nextNumber(`booking:${year}`, `BK-${year}-{SEQ:5}`, { session });

      const [doc] = await Booking.create(
        [
          {
            bookingNo,
            courtId: court._id,
            sportId: sport._id,
            locationId: court.locationId || loc?._id || null,
            start: startUtc,
            end: endUtc,
            localDate,
            slotStarts: units,
            type,
            bookedByMemberId: memberId || null,
            membershipId: entitlements?.membershipId || null,
            customer: input.customer || null,
            participants: input.participants || [],
            channel: input.channel || 'front_desk',
            status,
            price: {
              basePaise: price.basePaise,
              discountPaise: price.discountPaise,
              taxPaise: price.taxPaise,
              totalPaise: price.totalPaise,
              rule: price.rule,
            },
            paymentStatus,
            holdExpiresAt,
            notes: input.notes || '',
            priceOverrideReason: input.priceOverrideReason || '',
            ...(idempotencyKey ? { idempotencyKey } : {}),
            isDemo: Boolean(input.isDemo),
          },
        ],
        { session },
      );

      try {
        await SlotLock.insertMany(
          units.map((u) => ({
            courtId: court._id,
            slotStart: u,
            kind: isHold ? 'hold' : 'booking',
            refId: doc._id,
            ...(isHold ? { expiresAt: holdExpiresAt } : {}),
            isDemo: Boolean(input.isDemo),
          })),
          { session, ordered: true },
        );
      } catch (err) {
        throw translateLockError(err, { courtId: court._id, startUtc });
      }

      let invoice = null;
      let payment = null;
      if (
        status === 'confirmed' &&
        price.totalPaise > 0 &&
        DESK_METHODS.has(paymentMode) &&
        paymentMode !== 'desk' &&
        paymentMode !== 'free'
      ) {
        const customerId = await ensureCustomerId({
          member,
          customer: input.customer,
          isDemo: input.isDemo,
          session,
        });
        if (!customerId) {
          throw Validation([{ path: 'customer', message: 'A customer is required before this booking can be invoiced' }]);
        }
        invoice = await createCourtInvoice({
          customerId,
          booking: doc,
          price,
          court,
          session,
          isDemo: input.isDemo,
        });
        payment = await captureDeskPayment(invoice, paymentMode, session, ctx, input.isDemo);
        doc.customerId = customerId;
        doc.invoiceId = invoice._id;
        doc.paymentIds = [payment._id];
        doc.paymentStatus = 'paid';
        await doc.save({ session });
      }

      await audit.record({
        actor: actorFromCtx(ctx),
        source: ctx.source || 'admin',
        action: status === 'held' ? 'booking.held' : 'booking.confirmed',
        entity: { type: 'booking', id: String(doc._id), label: bookingNo },
        after: { courtId: String(court._id), start: startUtc, status, totalPaise: price.totalPaise },
        requestId: ctx.requestId,
        ip: ctx.ip,
      });

      return doc.toObject ? doc.toObject() : doc;
    });
  } catch (err) {
    if (err?.code === 'SLOT_UNAVAILABLE') {
      const alternatives = await findAlternatives({
        courtId: court._id,
        sportId: sport._id,
        startUtc,
        sessionMinutes,
        slotStep,
      });
      err.details = { ...(err.details || {}), alternatives };
    }
    throw err;
  }

  if (memberId) {
    await recordActivity({
      memberId,
      type: booking.status === 'held' ? 'booking.held' : 'booking.confirmed',
      title: `Booking ${booking.bookingNo}`,
      refType: 'booking',
      refId: booking._id,
      amountPaise: booking.price?.totalPaise,
      source: input.channel || 'admin',
      isDemo: input.isDemo,
    }).catch(() => {});
  }

  return booking;
}

export async function confirmPayment(bookingId, ctx = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw NotFound('Booking');
  if (booking.status === 'confirmed' || booking.status === 'checked_in') return booking.toObject();

  const now = clockNow();
  const expired =
    booking.status === 'expired' ||
    (booking.status === 'held' && booking.holdExpiresAt && booking.holdExpiresAt < now);

  if (booking.status !== 'held' && booking.status !== 'expired') {
    throw Conflict('INVALID_STATUS', `Cannot confirm payment for status ${booking.status}`);
  }

  if (expired) {
    // Try re-lock
    try {
      return await withTransaction(async (session) => {
        await SlotLock.deleteMany({ refId: booking._id, kind: 'hold' }, { session });
        try {
          await SlotLock.insertMany(
            booking.slotStarts.map((u) => ({
              courtId: booking.courtId,
              slotStart: u,
              kind: 'booking',
              refId: booking._id,
              isDemo: booking.isDemo,
            })),
            { session, ordered: true },
          );
        } catch (err) {
          throw translateLockError(err, { courtId: booking.courtId, startUtc: booking.start });
        }
        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.holdExpiresAt = null;
        await booking.save({ session });
        return booking.toObject();
      });
    } catch (err) {
      if (err?.code === 'SLOT_UNAVAILABLE') {
        throw Conflict('HOLD_EXPIRED', 'Hold expired and slot was taken; refund required', {
          bookingId: String(booking._id),
          refundPaise: booking.price?.totalPaise || 0,
        });
      }
      throw err;
    }
  }

  return withTransaction(async (session) => {
    await SlotLock.updateMany(
      { refId: booking._id, kind: 'hold' },
      { $set: { kind: 'booking' }, $unset: { expiresAt: 1 } },
      { session },
    );
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.holdExpiresAt = null;
    await booking.save({ session });
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'booking.confirmed',
      entity: { type: 'booking', id: String(booking._id), label: booking.bookingNo },
      requestId: ctx.requestId,
    });
    return booking.toObject();
  });
}

export async function cancel(bookingId, input = {}, ctx = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw NotFound('Booking');
  if (['cancelled', 'completed', 'expired'].includes(booking.status)) {
    throw Conflict('INVALID_STATUS', `Cannot cancel booking in status ${booking.status}`);
  }

  const settings = await Settings.findOne({ locationId: null }).lean();
  const freeHours = settings?.bookingCancelFreeHours ?? 4;
  const now = clockNow();
  const msUntil = booking.start.getTime() - now.getTime();
  const freeWindow = msUntil >= freeHours * 3600 * 1000;
  const refundPaise =
    input.forceRefund || freeWindow ? booking.price?.totalPaise || 0 : 0;

  const result = await withTransaction(async (session) => {
    booking.status = 'cancelled';
    booking.cancellation = {
      at: now,
      by: actorFromCtx(ctx).name,
      reason: input.reason || '',
      refundPaise,
      refundMethod: refundPaise > 0 ? input.refundMethod || 'original' : 'none',
    };
    if (refundPaise > 0 && booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }
    await booking.save({ session });
    await SlotLock.deleteMany({ refId: booking._id }, { session });

    if (booking.bookedByMemberId) {
      await MemberDayCounter.findOneAndUpdate(
        {
          memberId: booking.bookedByMemberId,
          localDate: booking.localDate,
          count: { $gt: 0 },
        },
        { $inc: { count: -1 } },
        { session },
      );
    }

    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'booking.cancelled',
      entity: { type: 'booking', id: String(booking._id), label: booking.bookingNo },
      after: { refundPaise, reason: input.reason },
      reason: input.reason,
      requestId: ctx.requestId,
    });

    return booking.toObject();
  });

  if (booking.bookedByMemberId) {
    await recordActivity({
      memberId: booking.bookedByMemberId,
      type: 'booking.cancelled',
      title: `Cancelled ${booking.bookingNo}`,
      refType: 'booking',
      refId: booking._id,
      amountPaise: refundPaise,
      source: ctx.source || 'admin',
      isDemo: booking.isDemo,
    }).catch(() => {});
  }

  return result;
}

export async function reschedule(bookingId, input, ctx = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw NotFound('Booking');
  if (!['confirmed', 'held'].includes(booking.status)) {
    throw Conflict('INVALID_STATUS', `Cannot reschedule status ${booking.status}`);
  }

  const court = await Court.findById(input.courtId || booking.courtId).lean();
  if (!court || court.status !== 'active') throw NotFound('Court');
  const sport = await Sport.findById(court.sportId).lean();
  const sessionMinutes = sport.sessionMinutes || 60;
  const slotStep = sport.slotStepMinutes || 30;
  const startUtc = new Date(input.startUtc);
  const aligned = alignToSlot(startUtc, slotStep);
  if (aligned.getTime() !== startUtc.getTime()) {
    throw Validation([{ path: 'startUtc', message: `Start must align to ${slotStep}-minute slots` }]);
  }
  const endUtc = addMinutesUtc(startUtc, sessionMinutes);
  const units = sessionUnits(startUtc, sessionMinutes, slotStep);
  const newLocalDate = toLocalDate(startUtc);
  const oldLocalDate = booking.localDate;
  const now = clockNow();

  try {
    return await withTransaction(async (session) => {
      await SlotLock.deleteMany(
        {
          courtId: court._id,
          slotStart: { $in: units },
          kind: 'hold',
          expiresAt: { $lt: now },
        },
        { session },
      );

      // Release our old units first (same txn) so overlapping reschedules don't self-conflict.
      await SlotLock.deleteMany({ refId: booking._id }, { session });

      try {
        await SlotLock.insertMany(
          units.map((u) => ({
            courtId: court._id,
            slotStart: u,
            kind: booking.status === 'held' ? 'hold' : 'booking',
            refId: booking._id,
            ...(booking.status === 'held' && booking.holdExpiresAt
              ? { expiresAt: booking.holdExpiresAt }
              : {}),
            isDemo: booking.isDemo,
          })),
          { session, ordered: true },
        );
      } catch (err) {
        throw translateLockError(err, { courtId: court._id, startUtc });
      }

      if (booking.bookedByMemberId && newLocalDate !== oldLocalDate) {
        await MemberDayCounter.findOneAndUpdate(
          {
            memberId: booking.bookedByMemberId,
            localDate: oldLocalDate,
            count: { $gt: 0 },
          },
          { $inc: { count: -1 } },
          { session },
        );
        await MemberDayCounter.updateOne(
          { memberId: booking.bookedByMemberId, localDate: newLocalDate },
          { $setOnInsert: { count: 0 } },
          { upsert: true, session },
        );
        const r = await MemberDayCounter.findOneAndUpdate(
          {
            memberId: booking.bookedByMemberId,
            localDate: newLocalDate,
            count: { $lt: 2 },
          },
          { $inc: { count: 1 } },
          { new: true, session },
        );
        if (!r) {
          throw Conflict('DAILY_LIMIT_REACHED', `Daily limit reached on ${newLocalDate}`);
        }
      }

      booking.courtId = court._id;
      booking.sportId = sport._id;
      booking.start = startUtc;
      booking.end = endUtc;
      booking.localDate = newLocalDate;
      booking.slotStarts = units;
      await booking.save({ session });

      await audit.record({
        actor: actorFromCtx(ctx),
        source: ctx.source || 'admin',
        action: 'booking.rescheduled',
        entity: { type: 'booking', id: String(booking._id), label: booking.bookingNo },
        after: { start: startUtc, courtId: String(court._id) },
        requestId: ctx.requestId,
      });

      return booking.toObject();
    });
  } catch (err) {
    if (err?.code === 'SLOT_UNAVAILABLE') {
      const alternatives = await findAlternatives({
        courtId: court._id,
        sportId: sport._id,
        startUtc,
        sessionMinutes,
        slotStep,
      });
      err.details = { ...(err.details || {}), alternatives };
    }
    throw err;
  }
}

export async function checkIn(bookingId, ctx = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw NotFound('Booking');
  if (booking.status !== 'confirmed') {
    throw Conflict('INVALID_STATUS', `Cannot check in status ${booking.status}`);
  }
  booking.status = 'checked_in';
  await booking.save();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'booking.checked_in',
    entity: { type: 'booking', id: String(booking._id), label: booking.bookingNo },
    requestId: ctx.requestId,
  });
  return booking.toObject();
}

export async function markNoShow(bookingId, ctx = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw NotFound('Booking');
  if (!['confirmed'].includes(booking.status)) {
    throw Conflict('INVALID_STATUS', `Cannot mark no-show for ${booking.status}`);
  }
  return withTransaction(async (session) => {
    booking.status = 'no_show';
    await booking.save({ session });
    await SlotLock.deleteMany({ refId: booking._id }, { session });
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'booking.no_show',
      entity: { type: 'booking', id: String(booking._id), label: booking.bookingNo },
      requestId: ctx.requestId,
    });
    return booking.toObject();
  });
}

/** Worker: expire held bookings past holdExpiresAt */
export async function expireHolds() {
  const now = clockNow();
  const held = await Booking.find({
    status: 'held',
    holdExpiresAt: { $lt: now },
  }).limit(100);

  let expired = 0;
  for (const booking of held) {
    try {
      await withTransaction(async (session) => {
        const fresh = await Booking.findById(booking._id).session(session);
        if (!fresh || fresh.status !== 'held' || !(fresh.holdExpiresAt < now)) return;
        fresh.status = 'expired';
        await fresh.save({ session });
        await SlotLock.deleteMany({ refId: fresh._id, kind: 'hold' }, { session });
        if (fresh.bookedByMemberId) {
          await MemberDayCounter.findOneAndUpdate(
            {
              memberId: fresh.bookedByMemberId,
              localDate: fresh.localDate,
              count: { $gt: 0 },
            },
            { $inc: { count: -1 } },
            { session },
          );
        }
        expired += 1;
      });
    } catch {
      /* skip one; retry next tick */
    }
  }
  return { expired };
}

/** Worker: complete checked-in / mark no-show after grace */
export async function completeDue() {
  const now = clockNow();
  const graceMs = 15 * 60 * 1000;
  let completed = 0;
  let noShows = 0;

  const toComplete = await Booking.find({
    status: 'checked_in',
    end: { $lt: now },
  }).limit(100);

  for (const b of toComplete) {
    await withTransaction(async (session) => {
      const fresh = await Booking.findById(b._id).session(session);
      if (!fresh || fresh.status !== 'checked_in') return;
      fresh.status = 'completed';
      await fresh.save({ session });
      await SlotLock.deleteMany({ refId: fresh._id }, { session });
      completed += 1;
    }).catch(() => {});
  }

  const cutoff = new Date(now.getTime() - graceMs);
  const toNoShow = await Booking.find({
    status: 'confirmed',
    end: { $lt: cutoff },
  }).limit(100);

  for (const b of toNoShow) {
    try {
      await markNoShow(String(b._id), { source: 'system', user: { name: 'worker' } });
      noShows += 1;
    } catch {
      /* skip */
    }
  }

  return { completed, noShows };
}

export async function getById(id) {
  const booking = await Booking.findById(id)
    .populate('courtId', 'name code')
    .populate('sportId', 'key name')
    .populate('bookedByMemberId', 'firstName lastName memberCode phone')
    .lean();
  if (!booking) throw NotFound('Booking');
  return booking;
}

export async function list(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['start', '-start', 'createdAt', '-createdAt', 'bookingNo'],
    defaultSort: '-start',
    defaultPageSize: 50,
    maxPageSize: 200,
    searchFields: ['bookingNo'],
    buildFilter: (q) => {
      const filter = {};
      if (q.status) filter.status = q.status;
      if (q.type) filter.type = q.type;
      if (q.channel) filter.channel = q.channel;
      if (q.courtId) filter.courtId = q.courtId;
      if (q.sportId) filter.sportId = q.sportId;
      if (q.memberId) filter.bookedByMemberId = q.memberId;
      if (q.localDate) filter.localDate = q.localDate;
      if (q.from || q.to) {
        filter.start = {};
        if (q.from) filter.start.$gte = new Date(q.from);
        if (q.to) filter.start.$lte = new Date(q.to);
      }
      return filter;
    },
  });
  return runListQuery(Booking, parsed, {
    lean: true,
    populate: [
      { path: 'courtId', select: 'name code' },
      { path: 'sportId', select: 'key name' },
      { path: 'bookedByMemberId', select: 'firstName lastName memberCode' },
    ],
  });
}

export async function calendar({ localDate, sportId }) {
  const { startUtc, endUtc } = dayRange(localDate);
  const courtFilter = { status: { $in: ['active', 'maintenance'] } };
  if (sportId) courtFilter.sportId = sportId;
  const courts = await Court.find(courtFilter).select('name code sportId').lean();
  const courtIds = courts.map((c) => c._id);

  const bookings = await Booking.find({
    courtId: { $in: courtIds },
    start: { $gte: startUtc, $lt: endUtc },
    status: { $nin: ['cancelled', 'expired'] },
  })
    .populate('bookedByMemberId', 'firstName lastName memberCode')
    .lean();

  const locks = await SlotLock.find({
    courtId: { $in: courtIds },
    slotStart: { $gte: startUtc, $lt: endUtc },
    kind: { $in: ['block', 'social'] },
  }).lean();

  return {
    localDate,
    courts,
    bookings,
    blocks: locks.filter((l) => l.kind === 'block'),
    social: locks.filter((l) => l.kind === 'social'),
  };
}

export default {
  create,
  confirmPayment,
  cancel,
  reschedule,
  checkIn,
  markNoShow,
  expireHolds,
  completeDue,
  getById,
  list,
  calendar,
};
