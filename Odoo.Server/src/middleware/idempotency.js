import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';

const idempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    scope: { type: String, required: true },
    userId: { type: String, default: null },
    requestHash: { type: String, required: true },
    response: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { versionKey: false },
);

idempotencySchema.index({ scope: 1, key: 1 }, { unique: true });

export const IdempotencyKey =
  mongoose.models.IdempotencyKey ||
  mongoose.model('IdempotencyKey', idempotencySchema, 'idempotencyKeys');

function hashBody(body) {
  const raw = JSON.stringify(body ?? {});
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Idempotency middleware for money/booking/order POSTs.
 * Requires header Idempotency-Key.
 * @param {{ required?: boolean, scope?: string }} [opts]
 */
export function idempotency(opts = {}) {
  const required = opts.required !== false;

  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string') {
      if (required) {
        return next(new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required', 422));
      }
      return next();
    }

    const scope = opts.scope || `${req.method}:${req.baseUrl}${req.path}`;
    const requestHash = hashBody(req.body);
    const userId = req.user?._id?.toString?.() || req.user?.id || null;

    try {
      const existing = await IdempotencyKey.findOne({ scope, key }).lean();
      if (existing) {
        if (existing.requestHash !== requestHash) {
          return next(
            new AppError(
              'IDEMPOTENCY_CONFLICT',
              'Idempotency key reused with a different request body',
              409,
            ),
          );
        }
        if (existing.status === 'completed' && existing.response) {
          const stored = existing.response;
          return res.status(stored.statusCode || 200).json(stored.body);
        }
        if (existing.status === 'pending') {
          // Wait briefly for in-flight sibling (parallel same key)
          for (let i = 0; i < 20; i += 1) {
            await new Promise((r) => setTimeout(r, 50));
            const again = await IdempotencyKey.findOne({ scope, key }).lean();
            if (again?.status === 'completed' && again.response) {
              return res.status(again.response.statusCode || 200).json(again.response.body);
            }
            if (again?.status === 'failed') break;
          }
        }
      }

      try {
        await IdempotencyKey.create({
          key,
          scope,
          userId,
          requestHash,
          status: 'pending',
        });
      } catch (err) {
        if (err?.code === 11000) {
          // Lost race — reload and replay/wait
          const winner = await IdempotencyKey.findOne({ scope, key }).lean();
          if (winner?.requestHash !== requestHash) {
            return next(
              new AppError(
                'IDEMPOTENCY_CONFLICT',
                'Idempotency key reused with a different request body',
                409,
              ),
            );
          }
          for (let i = 0; i < 40; i += 1) {
            const again = await IdempotencyKey.findOne({ scope, key }).lean();
            if (again?.status === 'completed' && again.response) {
              return res.status(again.response.statusCode || 200).json(again.response.body);
            }
            await new Promise((r) => setTimeout(r, 50));
          }
          return next(new AppError('IDEMPOTENCY_CONFLICT', 'Idempotent request still in progress', 409));
        }
        throw err;
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const statusCode = res.statusCode || 200;
        IdempotencyKey.updateOne(
          { scope, key },
          { status: 'completed', response: { statusCode, body } },
        ).catch(() => {});
        return originalJson(body);
      };

      res.on('finish', () => {
        if (res.statusCode >= 500) {
          IdempotencyKey.updateOne({ scope, key }, { status: 'failed' }).catch(() => {});
        }
      });

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default idempotency;
