import { Membership } from './membership.model.js';
import { MembershipPlan } from './plan.model.js';
import { Member } from '../members/member.model.js';
import { ageYearsAt } from '../members/member.service.js';
import { entitlementsFor, NON_MEMBER_ENTITLEMENTS } from './entitlements.js';
import { recordActivity } from './activity.consumer.js';
import { Invoice } from '../finance/invoice.model.js';
import { Payment } from '../finance/payment.model.js';
import { Tax } from '../settings/tax.model.js';
import { buildComputedLines, allocateInvoiceNumber, financialYearKey } from '../finance/invoice.service.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { toLocalDate, localDateTimeToUtc } from '../../lib/time.js';
import { NotFound, Validation, Conflict, AppError } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { enqueue as enqueueNotification } from '../notifications/notification.service.js';

export { entitlementsFor, NON_MEMBER_ENTITLEMENTS };

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

function addMonthsLocal(localDate, months) {
  const [y, m, d] = localDate.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const ny = Math.floor(totalMonths / 12);
  const nm = (totalMonths % 12) + 1;
  const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, dim);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

function addDaysLocal(localDate, days) {
  const noon = localDateTimeToUtc(localDate, '12:00');
  const next = new Date(noon.getTime() + days * 24 * 60 * 60 * 1000);
  return toLocalDate(next);
}

function daysBetweenLocal(startLocal, endLocal) {
  const a = localDateTimeToUtc(startLocal, '12:00').getTime();
  const b = localDateTimeToUtc(endLocal, '12:00').getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function assertEligible(plan, member, at = new Date()) {
  const age = ageYearsAt(member.dob, at);
  const { minAge, maxAge } = plan.eligibility || {};
  if (minAge != null && age < minAge) {
    throw new AppError('ENTITLEMENT_DENIED', `Minimum age for ${plan.name} is ${minAge}`, 422, {
      age,
      minAge,
    });
  }
  if (maxAge != null && age > maxAge) {
    throw new AppError('ENTITLEMENT_DENIED', `Maximum age for ${plan.name} is ${maxAge}`, 422, {
      age,
      maxAge,
    });
  }
}

function durationPrice(plan, months) {
  const row = (plan.durations || []).find((d) => Number(d.months) === Number(months));
  if (!row) {
    throw Validation([{ path: 'months', message: `Duration ${months} months not offered on plan` }]);
  }
  return row.pricePaise;
}

/**
 * Quote a membership purchase / renewal.
 */
export async function quote(memberId, planId, months) {
  const member = await Member.findById(memberId).lean();
  if (!member || member.archivedAt) throw NotFound('Member');
  const plan = await MembershipPlan.findById(planId).lean();
  if (!plan || plan.archivedAt || !plan.active) throw NotFound('Membership plan');

  assertEligible(plan, member);

  const pricePaise = durationPrice(plan, months);
  let taxPaise = 0;
  let taxId = plan.taxId || null;
  if (taxId) {
    const tax = await Tax.findById(taxId).lean();
    if (tax) {
      const { totals } = await buildComputedLines([
        {
          description: `${plan.name} · ${months} mo`,
          revenueStream: 'membership',
          qty: 1,
          unitPricePaise: pricePaise,
          taxId: String(tax._id),
        },
      ]);
      taxPaise = totals.taxPaise;
    }
  }

  const today = toLocalDate();
  let startLocalDate = today;
  const current = await Membership.findOne({
    memberId: member._id,
    status: { $in: ['active', 'scheduled'] },
  })
    .sort({ endDate: -1 })
    .lean();
  if (current?.endLocalDate && current.endLocalDate >= today) {
    startLocalDate = addDaysLocal(current.endLocalDate, 1);
  }
  const endLocalDate = addDaysLocal(addMonthsLocal(startLocalDate, months), -1);

  return {
    memberId: String(member._id),
    planId: String(plan._id),
    planKey: plan.key,
    months: Number(months),
    pricePaise,
    taxPaise,
    totalPaise: pricePaise + taxPaise,
    startLocalDate,
    endLocalDate,
    eligibilityOk: true,
  };
}

async function createMembershipInvoice({ customerId, plan, months, pricePaise, membershipId, session, isDemo }) {
  const { lines, totals } = await buildComputedLines([
    {
      description: `${plan.name} membership · ${months} months`,
      revenueStream: 'membership',
      qty: 1,
      unitPricePaise: pricePaise,
      taxId: plan.taxId ? String(plan.taxId) : undefined,
    },
  ]);
  const number = await allocateInvoiceNumber('customer_invoice', { session });
  const now = new Date();
  const [invoice] = await Invoice.create(
    [
      {
        number,
        kind: 'customer_invoice',
        customerId,
        sourceType: 'membership',
        sourceId: membershipId || null,
        lines,
        totals,
        issueDate: now,
        dueDate: now,
        localDate: toLocalDate(now),
        status: 'posted',
        notes: `Membership ${plan.key}`,
        isDemo: Boolean(isDemo),
      },
    ],
    { session },
  );
  return invoice;
}

async function captureDeskPayment(invoice, method, session, ctx, isDemo) {
  const fy = financialYearKey();
  const paymentNo = await nextNumber(`payment:${fy}`, `PAY/${fy}/{SEQ:5}`, { session });
  const now = new Date();
  const amountPaise = invoice.totals.totalPaise;
  const rawMethod = method || 'cash';
  const payMethod = rawMethod === 'mock' || rawMethod === 'online' ? 'cash' : rawMethod;
  await Payment.create(
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
        at: now,
        localDate: toLocalDate(now),
        isDemo: Boolean(isDemo),
      },
    ],
    { session },
  );
  invoice.totals.paidPaise = amountPaise;
  invoice.totals.duePaise = 0;
  invoice.status = 'paid';
  await invoice.save({ session });
}

const DESK_METHODS = new Set(['cash', 'card', 'upi', 'mock']);

/**
 * Purchase a membership (desk or pending online).
 */
export async function purchase(input, ctx = {}) {
  const member = await Member.findById(input.memberId);
  if (!member || member.archivedAt) throw NotFound('Member');
  const plan = await MembershipPlan.findById(input.planId).lean();
  if (!plan || plan.archivedAt || !plan.active) throw NotFound('Membership plan');

  assertEligible(plan, member);
  const months = Number(input.months);
  const pricePaise = durationPrice(plan, months);
  const q = await quote(String(member._id), String(plan._id), months);

  let startLocalDate = input.startDate
    ? String(input.startDate).slice(0, 10)
    : q.startLocalDate;
  const endLocalDate = addDaysLocal(addMonthsLocal(startLocalDate, months), -1);
  const startDate = localDateTimeToUtc(startLocalDate, '00:00');
  const endDate = localDateTimeToUtc(endLocalDate, '23:59');

  const today = toLocalDate();
  const paidAtDesk = DESK_METHODS.has(input.paymentMethod || 'cash');
  let status = 'pending_payment';
  if (paidAtDesk) {
    status = startLocalDate > today ? 'scheduled' : 'active';
  }

  let result;
  try {
    result = await withTransaction(async (session) => {
      const existingActive = await Membership.findOne({
        memberId: member._id,
        status: 'active',
      }).session(session);
      if (existingActive && status === 'active') {
        throw Conflict('MEMBERSHIP_ACTIVE', 'Member already has an active membership', {
          membershipId: String(existingActive._id),
        });
      }

      const [membership] = await Membership.create(
        [
          {
            memberId: member._id,
            planId: plan._id,
            planKey: plan.key,
            planVersion: plan.version,
            entitlementsSnapshot: plan.entitlements || {},
            startDate,
            endDate,
            startLocalDate,
            endLocalDate,
            status,
            pricePaise,
            durationMonths: months,
            renewalOfId: input.renewalOfId || null,
            isDemo: Boolean(input.isDemo),
          },
        ],
        { session },
      );

      const invoice = await createMembershipInvoice({
        customerId: member.customerId,
        plan,
        months,
        pricePaise,
        membershipId: membership._id,
        session,
        isDemo: input.isDemo,
      });
      membership.invoiceId = invoice._id;
      await membership.save({ session });

      if (paidAtDesk) {
        await captureDeskPayment(invoice, input.paymentMethod, session, ctx, input.isDemo);
      }

      if (status === 'active' || status === 'scheduled') {
        if (status === 'active') {
          member.currentMembershipId = membership._id;
          member.tierKey = ['gold', 'silver', 'junior'].includes(plan.key) ? plan.key : 'none';
          member.status = 'active';
          member.membershipEndDate = endDate;
          await member.save({ session });
        }
      }

      return { membership, invoice };
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw Conflict('MEMBERSHIP_ACTIVE', 'Member already has an active membership');
    }
    throw err;
  }

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'membership.purchase',
    entity: {
      type: 'membership',
      id: String(result.membership._id),
      label: `${plan.key}-${months}m`,
    },
    after: {
      status: result.membership.status,
      planKey: plan.key,
      invoiceId: String(result.invoice._id),
    },
    requestId: ctx.requestId,
  });

  await recordActivity({
    memberId: member._id,
    type: 'membership.purchased',
    title: `Purchased ${plan.name} (${months} mo)`,
    refType: 'membership',
    refId: result.membership._id,
    amountPaise: pricePaise,
    source: ctx.source || 'admin',
    isDemo: Boolean(input.isDemo),
  });

  return {
    membership: result.membership.toObject
      ? result.membership.toObject()
      : result.membership,
    invoice: result.invoice.toObject ? result.invoice.toObject() : result.invoice,
  };
}

export async function renew(membershipId, months, ctx = {}) {
  const old = await Membership.findById(membershipId).lean();
  if (!old) throw NotFound('Membership');
  const plan = await MembershipPlan.findOne({
    key: old.planKey,
    active: true,
    archivedAt: null,
  })
    .sort({ version: -1 })
    .lean();
  if (!plan) throw NotFound('Membership plan');

  const startLocalDate = addDaysLocal(old.endLocalDate, 1);
  return purchase(
    {
      memberId: String(old.memberId),
      planId: String(plan._id),
      months: Number(months) || old.durationMonths,
      paymentMethod: 'cash',
      startDate: startLocalDate,
      renewalOfId: old._id,
      isDemo: old.isDemo,
    },
    ctx,
  );
}

export async function upgrade(membershipId, newPlanId, ctx = {}) {
  const old = await Membership.findById(membershipId);
  if (!old || old.status !== 'active') throw NotFound('Active membership');
  const newPlan = await MembershipPlan.findById(newPlanId).lean();
  if (!newPlan || !newPlan.active || newPlan.archivedAt) throw NotFound('Membership plan');

  const member = await Member.findById(old.memberId);
  if (!member) throw NotFound('Member');
  assertEligible(newPlan, member);

  const today = toLocalDate();
  const totalDays = Math.max(1, daysBetweenLocal(old.startLocalDate, old.endLocalDate) + 1);
  const remainingDays = Math.max(0, daysBetweenLocal(today, old.endLocalDate) + 1);
  const creditPaise = Math.round((remainingDays / totalDays) * old.pricePaise);
  const months = old.durationMonths;
  const newPrice = durationPrice(newPlan, months);

  const result = await withTransaction(async (session) => {
    old.status = 'upgraded';
    await old.save({ session });

    const startDate = localDateTimeToUtc(today, '00:00');
    const endLocalDate = addDaysLocal(addMonthsLocal(today, months), -1);
    const endDate = localDateTimeToUtc(endLocalDate, '23:59');

    const [membership] = await Membership.create(
      [
        {
          memberId: member._id,
          planId: newPlan._id,
          planKey: newPlan.key,
          planVersion: newPlan.version,
          entitlementsSnapshot: newPlan.entitlements || {},
          startDate,
          endDate,
          startLocalDate: today,
          endLocalDate,
          status: 'active',
          pricePaise: newPrice,
          durationMonths: months,
          renewalOfId: old._id,
          isDemo: old.isDemo,
        },
      ],
      { session },
    );

    const invoice = await createMembershipInvoice({
      customerId: member.customerId,
      plan: newPlan,
      months,
      pricePaise: Math.max(0, newPrice - creditPaise),
      membershipId: membership._id,
      session,
      isDemo: old.isDemo,
    });
    membership.invoiceId = invoice._id;
    await membership.save({ session });
    await captureDeskPayment(invoice, 'cash', session, ctx, old.isDemo);

    member.currentMembershipId = membership._id;
    member.tierKey = ['gold', 'silver', 'junior'].includes(newPlan.key) ? newPlan.key : 'none';
    member.status = 'active';
    member.membershipEndDate = endDate;
    await member.save({ session });

    return { membership, invoice, creditPaise };
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'membership.upgrade',
    entity: { type: 'membership', id: String(result.membership._id), label: newPlan.key },
    after: { creditPaise: result.creditPaise, from: old.planKey, to: newPlan.key },
    requestId: ctx.requestId,
  });

  return result;
}

export async function cancel(id, { reason, refund } = {}, ctx = {}) {
  const perms = ctx.user?.stringPermissions || ctx.user?.permissions || [];
  const have = new Set(Array.isArray(perms) ? perms : []);
  if (have.size && !have.has('membership.cancel') && ctx.user?.role !== 'ADMIN') {
    // route already gates; keep for service-level safety when called from jobs
  }

  const membership = await Membership.findById(id);
  if (!membership) throw NotFound('Membership');
  if (!['active', 'scheduled', 'pending_payment'].includes(membership.status)) {
    throw Conflict('MEMBERSHIP_NOT_CANCELLABLE', `Cannot cancel status ${membership.status}`);
  }

  membership.status = 'cancelled';
  membership.cancelledAt = new Date();
  membership.cancelReason = reason || '';
  await membership.save();

  const member = await Member.findById(membership.memberId);
  if (member && String(member.currentMembershipId) === String(membership._id)) {
    member.currentMembershipId = null;
    member.tierKey = 'none';
    member.status = 'expired';
    member.membershipEndDate = null;
    await member.save();
  }

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'membership.cancel',
    entity: { type: 'membership', id: String(membership._id), label: membership.planKey },
    after: { reason, refund: Boolean(refund) },
    requestId: ctx.requestId,
  });

  await recordActivity({
    memberId: membership.memberId,
    type: 'membership.cancelled',
    title: `Membership cancelled${reason ? `: ${reason}` : ''}`,
    refType: 'membership',
    refId: membership._id,
    source: ctx.source || 'admin',
  });

  return membership.toObject();
}

export async function listMemberships(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['startDate', '-startDate', 'endDate', '-endDate', 'createdAt', '-createdAt'],
    defaultSort: '-startDate',
    buildFilter: (q) => {
      const f = {};
      if (q.status === 'expiring') {
        const until = new Date();
        until.setUTCDate(until.getUTCDate() + 7);
        f.status = 'active';
        f.endDate = { $gte: new Date(), $lte: until };
      } else if (q.status === 'current') {
        f.status = { $in: ['active', 'scheduled', 'pending_payment'] };
      } else if (q.status) {
        f.status = q.status;
      }
      if (q.memberId) f.memberId = q.memberId;
      if (q.planKey) f.planKey = q.planKey;
      return f;
    },
  });
  return runListQuery(Membership, parsed, {
    populate: [
      { path: 'memberId', select: 'memberCode firstName lastName phone tierKey' },
      { path: 'planId', select: 'name key colour' },
    ],
  });
}

export async function listPlans(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['sortOrder', '-sortOrder', 'name', '-name'],
    defaultSort: 'sortOrder',
    searchFields: ['name', 'key'],
    buildFilter: (q) => {
      const f = { archivedAt: null };
      if (q.active === 'true') f.active = true;
      if (q.active === 'false') f.active = false;
      if (q.key) f.key = q.key;
      return f;
    },
  });
  return runListQuery(MembershipPlan, parsed);
}

export async function getPlan(id) {
  const plan = await MembershipPlan.findById(id).lean();
  if (!plan || plan.archivedAt) throw NotFound('Membership plan');
  return plan;
}

export async function createPlan(body, ctx = {}) {
  const doc = await MembershipPlan.create({
    ...body,
    key: String(body.key).toLowerCase(),
    version: 1,
    active: body.active !== false,
  });
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'membership_plan.create',
    entity: { type: 'membershipPlan', id: String(doc._id), label: doc.key },
    after: doc.toObject(),
    requestId: ctx.requestId,
  });
  return doc.toObject();
}

/**
 * Edit plan. If active memberships exist and price/entitlements change → new version.
 */
export async function updatePlan(id, body, ctx = {}) {
  const plan = await MembershipPlan.findById(id);
  if (!plan || plan.archivedAt) throw NotFound('Membership plan');

  const activeCount = await Membership.countDocuments({
    planId: plan._id,
    status: { $in: ['active', 'scheduled'] },
  });

  const touchesPriceOrEntitlements =
    body.durations !== undefined ||
    body.entitlements !== undefined ||
    body.eligibility !== undefined ||
    body.taxId !== undefined;

  if (activeCount > 0 && touchesPriceOrEntitlements) {
    plan.active = false;
    plan.archivedAt = new Date();
    await plan.save();

    const next = await MembershipPlan.create({
      key: plan.key,
      name: body.name ?? plan.name,
      description: body.description ?? plan.description,
      colour: body.colour ?? plan.colour,
      version: plan.version + 1,
      durations: body.durations ?? plan.durations,
      eligibility: body.eligibility ?? plan.eligibility,
      entitlements: body.entitlements ?? plan.entitlements,
      taxId: body.taxId !== undefined ? body.taxId : plan.taxId,
      active: true,
      sortOrder: body.sortOrder ?? plan.sortOrder,
      isDemo: plan.isDemo,
    });

    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'membership_plan.version',
      entity: { type: 'membershipPlan', id: String(next._id), label: `${next.key} v${next.version}` },
      before: { id: String(plan._id), version: plan.version },
      after: { id: String(next._id), version: next.version },
      requestId: ctx.requestId,
    });
    return { plan: next.toObject(), versioned: true, previousId: String(plan._id) };
  }

  const fields = [
    'name',
    'description',
    'colour',
    'durations',
    'eligibility',
    'entitlements',
    'taxId',
    'active',
    'sortOrder',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) plan[f] = body[f];
  }
  await plan.save();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'membership_plan.update',
    entity: { type: 'membershipPlan', id: String(plan._id), label: plan.key },
    after: plan.toObject(),
    requestId: ctx.requestId,
  });
  return { plan: plan.toObject(), versioned: false };
}

/**
 * Hide a plan from admin lists, new sales, and the public site.
 * Live memberships on that plan (any version of the same key) are cancelled
 * the same way as a membership cancel: status cancelled, member tier cleared.
 */
export async function archivePlan(id, ctx = {}) {
  const plan = await MembershipPlan.findById(id);
  if (!plan || plan.archivedAt) throw NotFound('Membership plan');

  const live = await Membership.find({
    planKey: plan.key,
    status: { $in: ['active', 'scheduled', 'pending_payment'] },
  }).select('_id');

  let cancelledMemberships = 0;
  for (const row of live) {
    await cancel(
      String(row._id),
      { reason: `Plan ${plan.name} deleted` },
      ctx,
    );
    cancelledMemberships += 1;
  }

  const openVersions = await MembershipPlan.find({
    key: plan.key,
    archivedAt: null,
  });
  for (const doc of openVersions) {
    const before = doc.toObject();
    doc.active = false;
    doc.archivedAt = new Date();
    await doc.save();
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'membership_plan.archive',
      entity: { type: 'membershipPlan', id: String(doc._id), label: doc.key },
      before,
      after: { ...doc.toObject(), cancelledMemberships },
      requestId: ctx.requestId,
    });
  }

  const archived = openVersions.find((doc) => String(doc._id) === String(plan._id)) || plan;
  return { plan: archived.toObject(), cancelledMemberships };
}

/**
 * Worker: expire active memberships past endLocalDate.
 */
export async function expireDue(now = new Date()) {
  const today = toLocalDate(now);
  const due = await Membership.find({
    status: 'active',
    endLocalDate: { $lt: today },
  }).limit(500);

  let expired = 0;
  for (const m of due) {
    m.status = 'expired';
    await m.save();
    const member = await Member.findById(m.memberId);
    if (member && String(member.currentMembershipId) === String(m._id)) {
      member.status = 'expired';
      member.tierKey = 'none';
      await member.save();
    }
    await recordActivity({
      memberId: m.memberId,
      type: 'membership.expired',
      title: `Membership ${m.planKey} expired`,
      refType: 'membership',
      refId: m._id,
      source: 'worker',
    });
    expired += 1;
  }

  // Activate scheduled memberships whose start has arrived
  const toActivate = await Membership.find({
    status: 'scheduled',
    startLocalDate: { $lte: today },
    endLocalDate: { $gte: today },
  }).limit(200);

  let activated = 0;
  for (const m of toActivate) {
    try {
      m.status = 'active';
      await m.save();
      await Member.findByIdAndUpdate(m.memberId, {
        $set: {
          currentMembershipId: m._id,
          tierKey: ['gold', 'silver', 'junior'].includes(m.planKey) ? m.planKey : 'none',
          status: 'active',
          membershipEndDate: m.endDate,
        },
      });
      activated += 1;
    } catch (err) {
      if (err?.code === 11000) {
        m.status = 'cancelled';
        m.cancelReason = 'concurrent_active';
        await m.save();
      } else throw err;
    }
  }

  return { expired, activated };
}

/**
 * Worker: send 30/7/1/0 day reminders once each (idempotent via reminderSentAt).
 */
export async function sendReminders(now = new Date()) {
  const today = toLocalDate(now);
  const windows = [
    { days: 30, field: 'd30', template: 'membership.expiring_7d' },
    { days: 7, field: 'd7', template: 'membership.expiring_7d' },
    { days: 1, field: 'd1', template: 'membership.expiring_7d' },
    { days: 0, field: 'd0', template: 'membership.expiring_7d' },
  ];

  let sent = 0;
  for (const w of windows) {
    const targetEnd = addDaysLocal(today, w.days);
    const candidates = await Membership.find({
      status: 'active',
      endLocalDate: targetEnd,
      [`reminderSentAt.${w.field}`]: null,
    }).limit(200);

    for (const m of candidates) {
      const updated = await Membership.findOneAndUpdate(
        { _id: m._id, [`reminderSentAt.${w.field}`]: null },
        { $set: { [`reminderSentAt.${w.field}`]: now } },
        { new: true },
      );
      if (!updated) continue;

      const member = await Member.findById(m.memberId).lean();
      await enqueueNotification({
        channel: 'in_app',
        template: w.template,
        title: `Membership expiring in ${w.days} day(s)`,
        body: `${member?.firstName || 'Member'} — ${m.planKey} ends ${m.endLocalDate}`,
        data: {
          memberId: String(m.memberId),
          membershipId: String(m._id),
          name: member?.firstName,
          endDate: m.endLocalDate,
          days: w.days,
        },
      });
      sent += 1;
    }
  }
  return { sent };
}

export default {
  quote,
  purchase,
  renew,
  upgrade,
  cancel,
  entitlementsFor,
  expireDue,
  sendReminders,
  listMemberships,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  archivePlan,
};
