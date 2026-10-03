import { Conflict } from '../../lib/errors.js';
import { SlotLock } from './slotLock.model.js';
import { addMinutesUtc, toLocalDate } from '../../lib/time.js';

/**
 * Translate Mongo duplicate-key / unique-index failures into domain Conflicts.
 * @param {Error} err
 * @param {{ courtId?: string, startUtc?: Date, sportId?: string }} [ctx]
 */
export function translateLockError(err, ctx = {}) {
  const isDup =
    err?.code === 11000 ||
    /E11000|duplicate key/i.test(String(err?.message || ''));
  if (!isDup) return err;

  const key = err?.keyPattern || {};
  const indexName = err?.message || '';
  if (key.courtId || key.slotStart || /courtId_1_slotStart_1/.test(indexName)) {
    return Conflict('SLOT_UNAVAILABLE', 'This court slot is no longer available', {
      courtId: ctx.courtId ? String(ctx.courtId) : undefined,
      start: ctx.startUtc || undefined,
      alternatives: ctx.alternatives || [],
    });
  }
  if (key.idempotencyKey || /idempotencyKey/.test(indexName)) {
    return Conflict('IDEMPOTENCY_CONFLICT', 'Duplicate booking request', {
      idempotencyKey: err?.keyValue?.idempotencyKey,
    });
  }
  return Conflict('CONFLICT', err.message || 'Conflict');
}

/**
 * Next free session starts on the same court + same time on sibling courts.
 * Computed after abort (outside the failed transaction).
 */
export async function findAlternatives({ courtId, sportId, startUtc, sessionMinutes = 60, slotStep = 30, limit = 3 }) {
  const alternatives = [];
  if (!courtId || !startUtc) return alternatives;

  const localDate = toLocalDate(startUtc);
  let cursor = addMinutesUtc(startUtc, slotStep);
  const dayEnd = addMinutesUtc(startUtc, 12 * 60);

  while (alternatives.length < limit && cursor < dayEnd) {
    const unit2 = addMinutesUtc(cursor, slotStep);
    const locks = await SlotLock.find({
      courtId,
      slotStart: { $in: [cursor, unit2] },
    }).lean();
    const live = locks.filter(
      (l) => !(l.kind === 'hold' && l.expiresAt && l.expiresAt < new Date()),
    );
    if (live.length === 0) {
      alternatives.push({
        courtId: String(courtId),
        start: cursor,
        end: addMinutesUtc(cursor, sessionMinutes),
        localDate,
        sameCourt: true,
      });
    }
    cursor = addMinutesUtc(cursor, slotStep);
  }

  if (sportId && alternatives.length < limit) {
    const { Court } = await import('../facilities/court.model.js');
    const siblings = await Court.find({
      sportId,
      status: 'active',
      _id: { $ne: courtId },
    })
      .select('_id name')
      .lean();
    const unit2 = addMinutesUtc(startUtc, slotStep);
    for (const c of siblings) {
      if (alternatives.length >= limit) break;
      const locks = await SlotLock.find({
        courtId: c._id,
        slotStart: { $in: [startUtc, unit2] },
      }).lean();
      const live = locks.filter(
        (l) => !(l.kind === 'hold' && l.expiresAt && l.expiresAt < new Date()),
      );
      if (live.length === 0) {
        alternatives.push({
          courtId: String(c._id),
          courtName: c.name,
          start: startUtc,
          end: addMinutesUtc(startUtc, sessionMinutes),
          localDate,
          sameCourt: false,
        });
      }
    }
  }

  return alternatives;
}

export default { translateLockError, findAlternatives };
