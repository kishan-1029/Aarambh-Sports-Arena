import { CourtBlock } from '../facilities/courtBlock.model.js';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { SlotLock } from './slotLock.model.js';
import { Booking } from './booking.model.js';
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

export async function create(input, ctx = {}) {
  const court = await Court.findById(input.courtId).lean();
  if (!court) throw NotFound('Court');
  const sport = await Sport.findById(court.sportId).lean();
  const slotStep = sport?.slotStepMinutes || 30;

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (!(end > start)) {
    throw Validation([{ path: 'end', message: 'end must be after start' }]);
  }

  const units = unitsBetween(start, end, slotStep);
  if (!units.length) {
    throw Validation([{ path: 'start', message: 'Block must cover at least one slot unit' }]);
  }

  const now = clockNow();
  const conflicts = await Booking.find({
    courtId: court._id,
    status: { $in: ['held', 'confirmed', 'checked_in'] },
    start: { $lt: end },
    end: { $gt: start },
  })
    .select('bookingNo start end status')
    .lean();

  if (conflicts.length && !input.force) {
    throw Conflict('BLOCK_CONFLICTS', 'Existing bookings overlap this block', {
      bookings: conflicts,
    });
  }

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

      const [block] = await CourtBlock.create(
        [
          {
            courtId: court._id,
            start,
            end,
            reason: input.reason,
            note: input.note || '',
            socialSessionId: input.socialSessionId || null,
            createdBy: ctx?.user?.name || '',
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
            kind: 'block',
            refId: block._id,
            isDemo: Boolean(input.isDemo),
          })),
          { session, ordered: true },
        );
      } catch (err) {
        throw translateLockError(err, { courtId: court._id, startUtc: start });
      }

      await audit.record({
        actor: {
          type: ctx?.user?.id ? 'user' : 'system',
          id: ctx?.user?.id ? String(ctx.user.id) : undefined,
          name: ctx?.user?.name || 'system',
        },
        source: ctx.source || 'admin',
        action: 'court_block.created',
        entity: { type: 'courtBlock', id: String(block._id), label: input.reason },
        after: { courtId: String(court._id), start, end },
        requestId: ctx.requestId,
      });

      return block.toObject();
    });
  } catch (err) {
    throw err;
  }
}

export async function remove(id, ctx = {}) {
  const block = await CourtBlock.findById(id);
  if (!block) throw NotFound('Court block');

  await withTransaction(async (session) => {
    await SlotLock.deleteMany({ refId: block._id, kind: 'block' }, { session });
    await CourtBlock.deleteOne({ _id: block._id }, { session });
    await audit.record({
      actor: {
        type: ctx?.user?.id ? 'user' : 'system',
        id: ctx?.user?.id ? String(ctx.user.id) : undefined,
        name: ctx?.user?.name || 'system',
      },
      source: ctx.source || 'admin',
      action: 'court_block.removed',
      entity: { type: 'courtBlock', id: String(block._id) },
      requestId: ctx.requestId,
    });
  });

  return { ok: true };
}

export async function list(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['start', '-start', 'createdAt'],
    defaultSort: '-start',
    defaultPageSize: 50,
    buildFilter: (q) => {
      const filter = {};
      if (q.courtId) filter.courtId = q.courtId;
      if (q.reason) filter.reason = q.reason;
      return filter;
    },
  });
  return runListQuery(CourtBlock, parsed, {
    lean: true,
    populate: [{ path: 'courtId', select: 'name code' }],
  });
}

export default { create, remove, list };
