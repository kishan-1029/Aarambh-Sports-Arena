import mongoose from 'mongoose';
import { config } from '../config/index.js';

let connecting = null;

/**
 * Connect mongoose once. Never logs the URI.
 * @param {string} [uri] optional override (tests)
 */
export async function connectDb(uri) {
  const target = uri || config.mongoUri;
  if (!target) {
    throw new Error('MongoDB URI missing (set MONGODB_URI or DATABASE)');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connecting) {
    await connecting;
    return mongoose.connection;
  }

  mongoose.set('strictQuery', false);

  connecting = mongoose
    .connect(target, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      connecting = null;
      return mongoose.connection;
    })
    .catch((err) => {
      connecting = null;
      throw err;
    });

  await connecting;
  return mongoose.connection;
}

export function getConnection() {
  return mongoose.connection;
}

function isRetryableTxnError(err) {
  if (!err) return false;
  const labels = err.errorLabels || err.errorLabelSet;
  if (labels && typeof labels.has === 'function' && labels.has('TransientTransactionError')) {
    return true;
  }
  if (Array.isArray(labels) && labels.includes('TransientTransactionError')) return true;
  const code = err.code || err.codeName;
  if (code === 112 || code === 'WriteConflict') return true;
  const msg = String(err.message || '');
  return /WriteConflict|TransientTransactionError/i.test(msg);
}

/**
 * Run fn inside a MongoDB transaction. Retries on WriteConflict / transient errors.
 * fn must be side-effect free (retry-safe): no emails/events inside.
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} fn
 * @param {{ maxRetries?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withTransaction(fn, opts = {}) {
  const maxRetries = opts.maxRetries ?? 5;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(
        async () => {
          result = await fn(session);
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        },
      );
      return result;
    } catch (err) {
      lastError = err;
      if (!isRetryableTxnError(err) || attempt === maxRetries - 1) {
        throw err;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
}

export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connecting = null;
}

export default { connectDb, getConnection, withTransaction, disconnectDb };
