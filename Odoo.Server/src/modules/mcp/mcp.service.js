/**
 * MCP tool backends — thin wrappers over domain services (no Mongo in mcp/ host).
 */
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { ApiKey } from './apiKey.model.js';
import { PendingAction } from './pendingAction.model.js';
import { getDashboardSummary } from '../dashboard/dashboard.service.js';
import * as memberService from '../members/member.service.js';
import * as bookingService from '../booking/booking.service.js';
import * as availabilityService from '../booking/availability.service.js';
import { Membership } from '../membership/membership.model.js';
import { Invoice } from '../finance/invoice.model.js';
import { toLocalDate, localDateTimeToUtc } from '../../lib/time.js';
import { AppError, NotFound, Validation } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { ROLE_PERMISSIONS } from '../auth/permissions.js';

function actorFromCtx(ctx) {
  return {
    type: 'apiKey',
    id: ctx?.apiKeyId || ctx?.user?.id,
    name: ctx?.user?.name || 'mcp',
  };
}

function addDaysLocal(localDate, days) {
  const noon = localDateTimeToUtc(localDate, '12:00');
  return toLocalDate(new Date(noon.getTime() + days * 86400000));
}

export async function getClubSummary(_query = {}) {
  const summary = await getDashboardSummary();
  return {
    period: summary.period,
    timezone: 'Asia/Kolkata',
    earnedPaise: summary.kpis.revenueTodayPaise ?? 0,
    earnedMonthPaise: summary.kpis.revenueMonthPaise ?? 0,
    collectedTodayPaise: summary.kpis.collectionsTodayPaise ?? 0,
    collectedMonthPaise: summary.kpis.collectionsMonthPaise ?? 0,
    bookingsToday: summary.kpis.bookingsToday,
    bookingsWeek: summary.kpis.bookingsWeek,
    membersActive: summary.kpis.membersActive,
    membershipsExpiringSoon: summary.kpis.membershipsExpiringSoon,
    courtsActive: summary.kpis.courtsActive,
    leadsOpen: summary.kpis.leadsOpen,
    occupancyHintPct: summary.kpis.occupancyHintPct,
    charts: {
      revenueTrend: summary.charts?.revenueTrend || [],
      bookingsBySport: summary.charts?.bookingsBySport || [],
      bookingsByStatus: summary.charts?.bookingsByStatus || [],
    },
  };
}

export async function getRevenue({ groupBy = 'day' } = {}) {
  const summary = await getDashboardSummary();
  if (groupBy === 'day') {
    return {
      timezone: 'Asia/Kolkata',
      groupBy: 'day',
      rows: summary.charts?.revenueTrend || [],
      monthPaise: summary.kpis.revenueMonthPaise,
      todayPaise: summary.kpis.revenueTodayPaise,
    };
  }
  // stream / method deferred — return month totals until finance reports land
  return {
    timezone: 'Asia/Kolkata',
    groupBy,
    note: 'Detailed stream/method breakdown lands with Phase 13 reports; showing MTD totals.',
    monthPaise: summary.kpis.revenueMonthPaise,
    todayPaise: summary.kpis.revenueTodayPaise,
    collectedMonthPaise: summary.kpis.collectionsMonthPaise,
  };
}

export async function getBookingSummary() {
  const summary = await getDashboardSummary();
  return {
    timezone: 'Asia/Kolkata',
    bookingsToday: summary.kpis.bookingsToday,
    bookingsWeek: summary.kpis.bookingsWeek,
    byStatus: summary.charts?.bookingsByStatus || [],
    bySport: summary.charts?.bookingsBySport || [],
    trend: summary.charts?.bookingsTrend || [],
  };
}

export async function getCourtAvailability({ date, sportId }) {
  return availabilityService.getAvailability({
    localDate: date,
    sportId: sportId || undefined,
  });
}

export async function searchMembers({ query, tier, status }) {
  const rows = await memberService.search(query, { limit: 10 });
  let list = Array.isArray(rows) ? rows : [];
  if (tier) list = list.filter((m) => m.tierKey === tier);
  if (status) list = list.filter((m) => m.status === status);
  return list.slice(0, 10).map((m) => ({
    id: String(m._id),
    memberCode: m.memberCode,
    name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
    phone: m.phone,
    tierKey: m.tierKey,
    status: m.status,
  }));
}

export async function getMember({ memberId, memberCode }) {
  if (!memberId && !memberCode) {
    throw Validation([{ path: 'memberId', message: 'memberId or memberCode required' }]);
  }
  let member;
  if (memberId) {
    member = await memberService.getProfile(memberId);
  } else {
    const hits = await memberService.search(memberCode, { limit: 5 });
    const hit = (hits || []).find((m) => m.memberCode === memberCode) || hits?.[0];
    if (hit) member = await memberService.getProfile(String(hit._id));
  }
  if (!member) throw NotFound('Member');
  return member;
}

export async function getExpiringMemberships({ withinDays = 7 } = {}) {
  const today = toLocalDate();
  const todayStart = localDateTimeToUtc(today, '00:00');
  const end = localDateTimeToUtc(addDaysLocal(today, withinDays), '23:59');
  const rows = await Membership.find({
    status: 'active',
    endDate: { $gte: todayStart, $lte: end },
  })
    .sort({ endDate: 1 })
    .limit(50)
    .populate({ path: 'memberId', select: 'firstName lastName memberCode phone tierKey' })
    .lean();

  return rows.map((m) => ({
    id: String(m._id),
    planKey: m.planKey,
    endLocalDate: m.endLocalDate || (m.endDate ? String(m.endDate).slice(0, 10) : null),
    member: m.memberId
      ? {
          id: String(m.memberId._id),
          name: `${m.memberId.firstName || ''} ${m.memberId.lastName || ''}`.trim(),
          code: m.memberId.memberCode,
          phone: m.memberId.phone,
          tierKey: m.memberId.tierKey,
        }
      : null,
  }));
}

async function prepareAction({ tool, args, summary, riskLevel = 'write', ctx }) {
  const actionId = `pa_${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await PendingAction.create({
    actionId,
    apiKeyId: ctx.apiKeyId,
    actingUserId: ctx.user.id,
    source: 'mcp',
    tool,
    args,
    summary,
    riskLevel,
    status: 'pending',
    expiresAt,
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: 'mcp',
    action: 'mcp.prepare',
    entity: { type: 'pendingAction', id: actionId, label: tool },
    after: { tool, summary, expiresAt },
    requestId: ctx.requestId,
  });

  return {
    status: 'confirmation_required',
    confirmationId: actionId,
    summary,
    expiresAt: expiresAt.toISOString(),
    riskLevel,
  };
}

export async function prepareCancelBooking({ bookingId, reason }, ctx) {
  const booking = await bookingService.getById?.(bookingId).catch(() => null);
  const label = booking?.bookingNo || bookingId;
  return prepareAction({
    tool: 'cancel_booking',
    args: { bookingId, reason },
    summary: `Cancel booking ${label}${reason ? ` — ${reason}` : ''}.`,
    riskLevel: 'write',
    ctx,
  });
}

export async function prepareCreateBooking(input, ctx) {
  const when = input.startUtc;
  return prepareAction({
    tool: 'create_booking',
    args: input,
    summary: `Create ${input.type || 'walk_in'} booking on court ${input.courtId} at ${when}${
      input.memberId ? ` for member ${input.memberId}` : ''
    }.`,
    riskLevel: 'write',
    ctx,
  });
}

export async function confirmAction({ confirmationId, reason }, ctx) {
  const doc = await PendingAction.findOne({ actionId: confirmationId });
  if (!doc) throw NotFound('Pending action');
  if (String(doc.apiKeyId) !== String(ctx.apiKeyId)) {
    throw new AppError('FORBIDDEN', 'Confirmation belongs to another credential', 403);
  }
  if (doc.status === 'confirmed' && doc.resultRef) {
    return { status: 'already_confirmed', result: doc.resultRef };
  }
  if (doc.status === 'cancelled') {
    throw new AppError('CANCELLED', 'Action was cancelled', 409);
  }
  if (doc.expiresAt.getTime() < Date.now() || doc.status === 'expired') {
    doc.status = 'expired';
    await doc.save();
    throw new AppError('EXPIRED', 'Confirmation expired', 410);
  }
  if (doc.riskLevel === 'high' && !reason) {
    throw Validation([{ path: 'reason', message: 'Reason required for high-risk actions' }]);
  }

  let result;
  if (doc.tool === 'cancel_booking') {
    result = await bookingService.cancel(
      doc.args.bookingId,
      { reason: doc.args.reason || reason || 'Cancelled via MCP' },
      ctx,
    );
  } else if (doc.tool === 'create_booking') {
    const body = {
      courtId: doc.args.courtId,
      startUtc: doc.args.startUtc,
      type: doc.args.type || (doc.args.memberId ? 'member' : 'walk_in'),
      channel: 'mcp',
      paymentMode: doc.args.paymentMode || 'cash',
      isDemo: true,
      idempotencyKey: confirmationId,
    };
    if (doc.args.memberId) {
      body.memberId = doc.args.memberId;
      body.bookedByMemberId = doc.args.memberId;
    } else {
      body.customer = {
        name: doc.args.customerName || 'MCP guest',
        phone: doc.args.customerPhone || '9999999999',
      };
    }
    result = await bookingService.create(body, ctx);
  } else {
    throw new AppError('UNKNOWN_TOOL', `Unsupported tool ${doc.tool}`, 400);
  }

  doc.status = 'confirmed';
  doc.reason = reason || '';
  doc.resultRef = result;
  await doc.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: 'mcp',
    action: 'mcp.confirm',
    entity: { type: 'pendingAction', id: confirmationId, label: doc.tool },
    after: { tool: doc.tool },
    requestId: ctx.requestId,
  });

  return { status: 'confirmed', tool: doc.tool, result };
}

export async function cancelAction({ confirmationId }, ctx) {
  const doc = await PendingAction.findOne({ actionId: confirmationId });
  if (!doc) throw NotFound('Pending action');
  if (String(doc.apiKeyId) !== String(ctx.apiKeyId)) {
    throw new AppError('FORBIDDEN', 'Confirmation belongs to another credential', 403);
  }
  if (doc.status === 'pending') {
    doc.status = 'cancelled';
    await doc.save();
  }
  return { status: doc.status, confirmationId };
}

export async function createApiKey({ name, scopes, expiresInDays }, sessionUser) {
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('hex');
  const plaintext = `ck_live_${prefix}_${secret}`;
  const secretHash = await bcrypt.hash(secret, 10);

  let perms = sessionUser.stringPermissions || [];
  if (sessionUser.role === 'ADMIN' && (!perms || !perms.length)) {
    perms = [...(ROLE_PERMISSIONS.owner || [])];
  }

  const expiresAt =
    expiresInDays != null
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

  const doc = await ApiKey.create({
    name,
    prefix,
    secretHash,
    scopes: scopes?.length ? scopes : ['mcp.read'],
    actingUserId: String(sessionUser.id),
    actingUserEmail: sessionUser.email || '',
    actingUserName: sessionUser.name || sessionUser.email || 'admin',
    actingRole: sessionUser.role || 'ADMIN',
    stringPermissions: perms,
    expiresAt,
  });

  await audit.record({
    actor: { type: 'user', id: String(sessionUser.id), name: sessionUser.name },
    source: 'admin',
    action: 'mcp.key.create',
    entity: { type: 'apiKey', id: String(doc._id), label: name },
    after: { prefix, scopes: doc.scopes, expiresAt },
  });

  return {
    id: String(doc._id),
    name: doc.name,
    prefix: doc.prefix,
    scopes: doc.scopes,
    expiresAt: doc.expiresAt,
    /** Shown once — store securely */
    apiKey: plaintext,
  };
}

export async function listApiKeys() {
  const rows = await ApiKey.find({})
    .sort({ createdAt: -1 })
    .select('-secretHash')
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    name: r.name,
    prefix: r.prefix,
    scopes: r.scopes,
    actingUserEmail: r.actingUserEmail,
    expiresAt: r.expiresAt,
    revokedAt: r.revokedAt,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
  }));
}

export async function revokeApiKey(id, sessionUser) {
  const doc = await ApiKey.findByIdAndUpdate(
    id,
    { $set: { revokedAt: new Date() } },
    { new: true },
  ).lean();
  if (!doc) throw NotFound('API key');
  await audit.record({
    actor: { type: 'user', id: String(sessionUser.id), name: sessionUser.name },
    source: 'admin',
    action: 'mcp.key.revoke',
    entity: { type: 'apiKey', id: String(doc._id), label: doc.name },
    after: { revokedAt: doc.revokedAt },
  });
  return { id: String(doc._id), revokedAt: doc.revokedAt };
}

/** Lightweight invoice MTD for MCP (reuse Invoice model via service layer intent) */
export async function getFinancialSnapshot() {
  const today = toLocalDate();
  const monthStart = `${today.slice(0, 8)}01`;
  const [monthAgg, todayAgg] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ['posted', 'partially_paid', 'paid'] },
          kind: { $ne: 'credit_note' },
          localDate: { $gte: monthStart, $lte: today },
        },
      },
      { $group: { _id: null, total: { $sum: '$totals.totalPaise' } } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ['posted', 'partially_paid', 'paid'] },
          kind: { $ne: 'credit_note' },
          localDate: today,
        },
      },
      { $group: { _id: null, total: { $sum: '$totals.totalPaise' } } },
    ]),
  ]);
  return {
    timezone: 'Asia/Kolkata',
    todayPaise: todayAgg[0]?.total || 0,
    monthPaise: monthAgg[0]?.total || 0,
  };
}

export default {
  getClubSummary,
  getRevenue,
  getBookingSummary,
  getCourtAvailability,
  searchMembers,
  getMember,
  getExpiringMemberships,
  prepareCancelBooking,
  prepareCreateBooking,
  confirmAction,
  cancelAction,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getFinancialSnapshot,
};
