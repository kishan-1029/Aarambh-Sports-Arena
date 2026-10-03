import crypto from 'node:crypto';
import { Member } from './member.model.js';
import { Customer } from '../customers/customer.model.js';
import { Membership } from '../membership/membership.model.js';
import { ActivityEvent } from '../membership/activity.model.js';
import { entitlementsFor } from '../membership/entitlements.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { toLocalDate } from '../../lib/time.js';
import { Conflict, NotFound, Validation, AppError } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { config } from '../../config/index.js';

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

/** Last 10 digits for Indian phone matching. */
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * Age in whole years at a local calendar date (IST day boundaries).
 * @param {Date|string} dob
 * @param {Date} [at]
 */
export function ageYearsAt(dob, at = new Date()) {
  const atLocal = toLocalDate(at);
  let dobLocal;
  if (typeof dob === 'string') {
    dobLocal = dob.slice(0, 10);
  } else if (dob instanceof Date) {
    dobLocal = toLocalDate(dob);
  } else {
    throw Validation([{ path: 'dob', message: 'Invalid date of birth' }]);
  }
  const [ay, am, ad] = atLocal.split('-').map(Number);
  const [by, bm, bd] = dobLocal.split('-').map(Number);
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age -= 1;
  return age;
}

function maskPhone(phone) {
  const n = normalizePhone(phone);
  if (n.length < 4) return '****';
  return `******${n.slice(-4)}`;
}

/**
 * @param {object} input
 * @param {object} [ctx]
 */
export async function register(input, ctx = {}) {
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const phone = String(input.phone || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  if (!firstName) throw Validation([{ path: 'firstName', message: 'Required' }]);
  if (!input.dob) throw Validation([{ path: 'dob', message: 'Required' }]);
  if (!phone && !email) {
    throw Validation([{ path: 'phone', message: 'Phone or email required' }]);
  }

  const dob = new Date(input.dob);
  if (Number.isNaN(dob.getTime())) {
    throw Validation([{ path: 'dob', message: 'Invalid date' }]);
  }

  const age = ageYearsAt(dob);
  if (age < 18) {
    if (!input.guardian?.name || !input.guardian?.phone) {
      throw Validation([
        { path: 'guardian', message: 'Guardian name and phone required for under-18' },
      ]);
    }
  }

  const phoneNorm = normalizePhone(phone);
  const or = [];
  if (phoneNorm) {
    or.push({ phone: new RegExp(`${phoneNorm}$`) });
  }
  if (email) or.push({ email });

  if (or.length) {
    const existingMember = await Member.findOne({
      archivedAt: null,
      $or: or,
    }).lean();
    if (existingMember) {
      throw Conflict('MEMBER_EXISTS', 'Member already exists', {
        memberId: String(existingMember._id),
        memberCode: existingMember.memberCode,
      });
    }
  }

  let customer = null;
  if (or.length) {
    customer = await Customer.findOne({
      archivedAt: null,
      $or: [
        ...(phoneNorm ? [{ phone: new RegExp(`${phoneNorm}$`) }] : []),
        ...(email ? [{ email }] : []),
      ],
    });
  }

  try {
    const member = await withTransaction(async (session) => {
      if (!customer) {
        const [created] = await Customer.create(
          [
            {
              type: 'person',
              name: `${firstName} ${lastName}`.trim(),
              email,
              phone,
              tags: ['member'],
              isDemo: Boolean(input.isDemo),
            },
          ],
          { session },
        );
        customer = created;
      } else if (!(customer.tags || []).includes('member')) {
        customer.tags = [...(customer.tags || []), 'member'];
        await customer.save({ session });
      }

      const memberCode = await nextNumber('memberCode', 'CC-{SEQ:6}', { session });
      const [doc] = await Member.create(
        [
          {
            memberCode,
            customerId: customer._id,
            firstName,
            lastName,
            dob,
            gender: input.gender || '',
            phone,
            email,
            photoUrl: input.photoUrl || '',
            emergencyContact: input.emergencyContact || {},
            guardian: input.guardian || {},
            status: 'prospect',
            tierKey: 'none',
            source: input.source || 'front_desk',
            isDemo: Boolean(input.isDemo),
          },
        ],
        { session },
      );
      return doc;
    });

    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'member.register',
      entity: { type: 'member', id: String(member._id), label: member.memberCode },
      after: { memberCode: member.memberCode, status: member.status },
      requestId: ctx.requestId,
    });

    return member.toObject ? member.toObject() : member;
  } catch (err) {
    if (err?.code === 11000) {
      throw Conflict('MEMBER_EXISTS', 'Member already exists');
    }
    throw err;
  }
}

export async function list(req) {
  const parsed = parseListQuery(req, {
    allowedSort: [
      'firstName',
      '-firstName',
      'createdAt',
      '-createdAt',
      'membershipEndDate',
      '-membershipEndDate',
      'lastVisitAt',
      '-lastVisitAt',
    ],
    defaultSort: '-createdAt',
    searchFields: ['firstName', 'lastName', 'phone', 'email', 'memberCode'],
    buildFilter: (q) => {
      const f = { archivedAt: null };
      if (q.tier) f.tierKey = q.tier;
      if (q.status) f.status = q.status;
      if (q.source) f.source = q.source;
      if (q.expiringIn) {
        const days = Number(q.expiringIn);
        if (days > 0) {
          const until = new Date();
          until.setUTCDate(until.getUTCDate() + days);
          f.membershipEndDate = { $gte: new Date(), $lte: until };
          f.status = f.status || 'active';
        }
      }
      return f;
    },
  });
  return runListQuery(Member, parsed);
}

/**
 * Ranked search: exact code → exact phone → text.
 */
export async function search(q, opts = {}) {
  const query = String(q || '').trim();
  if (!query) return [];
  const mask = opts.maskPhone !== false && !opts.fullPhone;

  const byCode = await Member.findOne({
    memberCode: query.toUpperCase(),
    archivedAt: null,
  }).lean();
  if (byCode) return [toCard(byCode, mask)];

  const phoneNorm = normalizePhone(query);
  if (phoneNorm.length >= 10) {
    const byPhone = await Member.find({
      archivedAt: null,
      phone: new RegExp(`${phoneNorm}$`),
    })
      .limit(20)
      .lean();
    if (byPhone.length) return byPhone.map((m) => toCard(m, mask));
  }

  const textHits = await Member.find(
    { archivedAt: null, $text: { $search: query } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .lean()
    .catch(async () => {
      // text index may be missing in fresh DBs — fall back to regex
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return Member.find({
        archivedAt: null,
        $or: [
          { firstName: re },
          { lastName: re },
          { email: re },
          { memberCode: re },
          { phone: re },
        ],
      })
        .limit(20)
        .lean();
    });

  return textHits.map((m) => toCard(m, mask));
}

function toCard(m, mask) {
  return {
    id: String(m._id),
    memberCode: m.memberCode,
    name: `${m.firstName} ${m.lastName || ''}`.trim(),
    photoUrl: m.photoUrl || '',
    tierKey: m.tierKey,
    status: m.status,
    membershipEndDate: m.membershipEndDate,
    phone: mask ? maskPhone(m.phone) : m.phone,
  };
}

export async function getProfile(id) {
  const member = await Member.findById(id).lean();
  if (!member || member.archivedAt) throw NotFound('Member');

  const membership = member.currentMembershipId
    ? await Membership.findById(member.currentMembershipId).lean()
    : await Membership.findOne({ memberId: member._id, status: 'active' }).lean();

  const entitlements = await entitlementsFor(String(member._id));

  return {
    member,
    membership,
    entitlements,
    counts: {
      bookingsThisMonth: 0,
      openTabPaise: 0,
      walletBalancePaise: member.walletBalancePaise || 0,
    },
  };
}

export async function timeline(id, { cursor, limit = 25 } = {}) {
  const member = await Member.findById(id).lean();
  if (!member || member.archivedAt) throw NotFound('Member');

  const filter = { memberId: member._id };
  if (cursor) {
    filter.at = { $lt: new Date(cursor) };
  }
  const rows = await ActivityEvent.find(filter).sort({ at: -1 }).limit(limit).lean();
  const nextCursor = rows.length ? rows[rows.length - 1].at : null;
  return { data: rows, meta: { nextCursor } };
}

export async function update(id, body, ctx = {}) {
  const before = await Member.findById(id).lean();
  if (!before || before.archivedAt) throw NotFound('Member');

  const allowed = [
    'firstName',
    'lastName',
    'dob',
    'gender',
    'phone',
    'email',
    'photoUrl',
    'emergencyContact',
    'guardian',
    'source',
  ];
  const $set = {};
  for (const k of allowed) {
    if (body[k] !== undefined) $set[k] = body[k];
  }
  if ($set.dob) $set.dob = new Date($set.dob);

  const doc = await Member.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'member.update',
    entity: { type: 'member', id, label: doc.memberCode },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

export async function archive(id, ctx = {}) {
  const before = await Member.findById(id).lean();
  if (!before || before.archivedAt) throw NotFound('Member');
  const doc = await Member.findByIdAndUpdate(
    id,
    { $set: { archivedAt: new Date(), status: 'suspended' } },
    { new: true },
  ).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'member.archive',
    entity: { type: 'member', id, label: doc.memberCode },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

/**
 * Signed short-lived QR token (HMAC, 24h).
 */
export function qrToken(id) {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const payload = `${id}.${exp}`;
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export async function getByQrToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new AppError('INVALID_QR', 'Invalid QR token', 400);
  const [id, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!id || !exp || exp * 1000 < Date.now()) {
    throw new AppError('QR_EXPIRED', 'QR token expired', 400);
  }
  const expected = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(`${id}.${exp}`)
    .digest('base64url');
  if (sig !== expected) throw new AppError('INVALID_QR', 'Invalid QR token', 400);
  return getProfile(id);
}

export default {
  register,
  list,
  search,
  getProfile,
  timeline,
  update,
  archive,
  qrToken,
  getByQrToken,
  ageYearsAt,
  normalizePhone,
};
