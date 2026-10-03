import { AuditLog } from './auditLog.model.js';
import { logger } from '../../lib/logger.js';

const SECRET_KEYS = /password|token|secret|apiKey|authorization|cookie/i;

function stripSecrets(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => stripSecrets(v, depth + 1));
  if (typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '[Redacted]' : stripSecrets(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Append-only audit record.
 * @param {{
 *   actor?: { type: string, id?: string, name?: string },
 *   source: string,
 *   action: string,
 *   entity?: { type: string, id?: string, label?: string },
 *   before?: unknown,
 *   after?: unknown,
 *   reason?: string,
 *   ip?: string,
 *   userAgent?: string,
 *   requestId?: string,
 * }} input
 */
export async function record(input) {
  try {
    const doc = await AuditLog.create({
      at: new Date(),
      actor: input.actor || { type: 'system', name: 'system' },
      source: input.source || 'system',
      action: input.action,
      entity: input.entity,
      before: stripSecrets(input.before),
      after: stripSecrets(input.after),
      reason: input.reason,
      ip: input.ip,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });
    return doc;
  } catch (err) {
    logger.error({ err, action: input.action }, 'audit.record failed');
    throw err;
  }
}

export const audit = { record };

export default audit;
