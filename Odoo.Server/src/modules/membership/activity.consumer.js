import { ActivityEvent } from './activity.model.js';

/**
 * Append a member timeline event (post-commit side effect).
 * @param {{
 *   memberId: string|import('mongoose').Types.ObjectId,
 *   type: string,
 *   title: string,
 *   refType?: string,
 *   refId?: string|import('mongoose').Types.ObjectId|null,
 *   amountPaise?: number|null,
 *   source?: string,
 *   at?: Date,
 *   isDemo?: boolean,
 * }} input
 */
export async function recordActivity(input) {
  if (!input?.memberId || !input?.type || !input?.title) return null;
  const [doc] = await ActivityEvent.create([
    {
      memberId: input.memberId,
      at: input.at || new Date(),
      type: input.type,
      title: input.title,
      refType: input.refType || '',
      refId: input.refId || null,
      amountPaise: input.amountPaise ?? null,
      source: input.source || 'system',
      isDemo: Boolean(input.isDemo),
    },
  ]);
  return doc;
}

/**
 * Stub consumer for domain events → activityEvents (wired fully in later phases).
 * @param {string} eventName
 * @param {object} payload
 */
export async function consumeDomainEvent(eventName, payload = {}) {
  if (!payload.memberId) return null;
  return recordActivity({
    memberId: payload.memberId,
    type: eventName,
    title: payload.title || eventName,
    refType: payload.refType,
    refId: payload.refId,
    amountPaise: payload.amountPaise,
    source: payload.source || 'event',
    isDemo: payload.isDemo,
  });
}

export default { recordActivity, consumeDomainEvent };
