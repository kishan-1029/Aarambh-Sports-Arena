import { SocialSession } from './socialSession.model.js';
import { SocialParticipant } from './socialParticipant.model.js';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { SlotLock } from './slotLock.model.js';
import { Member } from '../members/member.model.js';
import { withTransaction } from '../../lib/db.js';
import { addMinutesUtc } from '../../lib/time.js';
import { now as clockNow } from '../../lib/clock.js';
import { NotFound, Validation, Conflict } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { translateLockError } from './conflictGuard.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';

function unitsBetween(start, end, slotStep = 30) {
  const units = [];
  for (let t = new Date(start); t < end; t = addMinutesUtc(t, slotStep)) {
    units.push(new Date(t));
  }
  return units;
}

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) return { type: 'system', name: ctx?.user?.name || 'system' };
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

export async function create(input, ctx = {}) {
  const sport = await Sport.findById(input.sportId).lean();
  if (!sport) throw NotFound('Sport');
  const courts = await Court.find({
    _id: { $in: input.courtIds },
    status: 'active',
  }).lean();
  if (courts.length !== input.courtIds.length) {
    throw Validation([{ path: 'courtIds', message: 'One or more courts invalid' }]);
  }

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (!(end > start)) {
    throw Validation([{ path: 'end', message: 'end must be after start' }]);
  }

  const slotStep = sport.slotStepMinutes || 30;
  const now = clockNow();

  return withTransaction(async (session) => {
    const [sessionDoc] = await SocialSession.create(
      [
        {
          courtIds: input.courtIds,
          sportId: sport._id,
          start,
          end,
          title: input.title || 'Friday Social',
          capacity: input.capacity,
          pricePerPlayer: {
            memberPaise: input.pricePerPlayer?.memberPaise ?? 20000,
            guestPaise: input.pricePerPlayer?.guestPaise ?? 35000,
          },
          joinedCount: 0,
          status: 'open',
          membersOnly: Boolean(input.membersOnly),
          isDemo: Boolean(input.isDemo),
        },
      ],
      { session },
    );

    for (const court of courts) {
      const units = unitsBetween(start, end, slotStep);
      await SlotLock.deleteMany(
        {
          courtId: court._id,
          slotStart: { $in: units },
          kind: 'hold',
          expiresAt: { $lt: now },
        },
        { session },
      );
      try {
        await SlotLock.insertMany(
          units.map((u) => ({
            courtId: court._id,
            slotStart: u,
            kind: 'social',
            refId: sessionDoc._id,
            isDemo: Boolean(input.isDemo),
          })),
          { session, ordered: true },
        );
      } catch (err) {
        throw translateLockError(err, { courtId: court._id, startUtc: start });
      }
    }

    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'social_session.created',
      entity: { type: 'socialSession', id: String(sessionDoc._id), label: sessionDoc.title },
      requestId: ctx.requestId,
    });

    return sessionDoc.toObject();
  });
}

/**
 * Join — capacity guarded with findOneAndUpdate + $expr.
 */
export async function join(sessionId, input = {}, ctx = {}) {
  let member = null;
  if (input.memberId) {
    member = await Member.findById(input.memberId).lean();
    if (!member) throw NotFound('Member');
  }
  const name = input.name || (member ? `${member.firstName} ${member.lastName || ''}`.trim() : '');
  const phone = input.phone || member?.phone || '';
  if (!name) {
    throw Validation([{ path: 'name', message: 'name required' }]);
  }

  return withTransaction(async (session) => {
    const updated = await SocialSession.findOneAndUpdate(
      { _id: sessionId, status: 'open', $expr: { $lt: ['$joinedCount', '$capacity'] } },
      [
        {
          $set: {
            joinedCount: { $add: ['$joinedCount', 1] },
            status: {
              $cond: [
                { $gte: [{ $add: ['$joinedCount', 1] }, '$capacity'] },
                'full',
                'open',
              ],
            },
          },
        },
      ],
      { new: true, session },
    );

    if (!updated) {
      const cur = await SocialSession.findById(sessionId).session(session).lean();
      if (!cur) throw NotFound('Social session');
      throw Conflict('SESSION_FULL', 'Social session is full');
    }

    try {
      const [participant] = await SocialParticipant.create(
        [
          {
            sessionId: updated._id,
            memberId: member?._id || null,
            name,
            phone,
            paymentStatus: input.paymentStatus || 'pay_at_desk',
            joinedAt: clockNow(),
            isDemo: Boolean(input.isDemo),
          },
        ],
        { session },
      );

      await audit.record({
        actor: actorFromCtx(ctx),
        source: ctx.source || 'admin',
        action: 'social_session.joined',
        entity: { type: 'socialSession', id: String(updated._id), label: updated.title },
        after: { participantId: String(participant._id), joinedCount: updated.joinedCount },
        requestId: ctx.requestId,
      });

      return { session: updated.toObject(), participant: participant.toObject() };
    } catch (err) {
      if (err?.code === 11000) {
        throw Conflict('ALREADY_JOINED', 'Member already joined this session');
      }
      throw err;
    }
  });
}

export async function list(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['start', '-start'],
    defaultSort: '-start',
    defaultPageSize: 50,
    buildFilter: (q) => {
      const filter = {};
      if (q.status) filter.status = q.status;
      if (q.sportId) filter.sportId = q.sportId;
      return filter;
    },
  });
  return runListQuery(SocialSession, parsed, { lean: true });
}

export async function getById(id) {
  const session = await SocialSession.findById(id).lean();
  if (!session) throw NotFound('Social session');
  const participants = await SocialParticipant.find({ sessionId: id }).lean();
  return { ...session, participants };
}

export async function cancel(id, ctx = {}) {
  const doc = await SocialSession.findById(id);
  if (!doc) throw NotFound('Social session');
  return withTransaction(async (session) => {
    doc.status = 'cancelled';
    await doc.save({ session });
    await SlotLock.deleteMany({ refId: doc._id, kind: 'social' }, { session });
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'social_session.cancelled',
      entity: { type: 'socialSession', id: String(doc._id) },
      requestId: ctx.requestId,
    });
    return doc.toObject();
  });
}

export default { create, join, list, getById, cancel };
