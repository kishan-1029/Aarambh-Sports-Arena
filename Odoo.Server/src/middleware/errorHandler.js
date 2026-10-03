import { AppError, toErrorEnvelope } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

/**
 * Express error handler: AppError → isOk envelope.
 * Passes other errors to the next (legacy) handler so existing controllers stay intact.
 */
export function errorHandler(err, req, res, next) {
  const requestId = req.requestId || req.id;

  if (err?.code === 11000) {
    const conflict = new AppError('CONFLICT', 'Duplicate key', 409, {
      keyValue: err.keyValue,
    });
    const { status, body } = toErrorEnvelope(conflict, { requestId });
    logger.warn({ err: conflict, requestId }, conflict.message);
    return res.status(status).json(body);
  }

  if (err instanceof AppError) {
    const { status, body } = toErrorEnvelope(err, { requestId, isProd: config.isProd });
    if (status >= 500) logger.error({ err, requestId }, err.message);
    else logger.warn({ err, requestId, code: err.code }, err.message);
    return res.status(status).json(body);
  }

  return next(err);
}

export default errorHandler;
