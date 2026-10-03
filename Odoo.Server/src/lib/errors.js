/**
 * Domain errors mapped to the { isOk } envelope (ADR-0004).
 */

export class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status=400]
   * @param {unknown} [details]
   */
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function NotFound(entity = 'Resource') {
  return new AppError('NOT_FOUND', `${entity} not found`, 404);
}

export function Forbidden(perm) {
  return new AppError('FORBIDDEN', 'Forbidden', 403, perm ? { permission: perm } : undefined);
}

export function Conflict(code = 'CONFLICT', msg = 'Conflict', details) {
  return new AppError(code, msg, 409, details);
}

export function Validation(details, message = 'Validation failed') {
  return new AppError('VALIDATION_ERROR', message, 422, details);
}

export function Unauthorized(message = 'Unauthenticated') {
  return new AppError('UNAUTHENTICATED', message, 401);
}

/**
 * Build isOk error envelope from AppError or generic Error.
 * @param {Error|AppError} err
 * @param {{ requestId?: string, isProd?: boolean }} [opts]
 */
export function toErrorEnvelope(err, opts = {}) {
  const requestId = opts.requestId;
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        isOk: false,
        status: err.status,
        message: err.message,
        error: err.details !== undefined ? { code: err.code, message: err.message, details: err.details } : err.code,
        ...(requestId ? { requestId } : {}),
      },
    };
  }

  const status = 500;
  return {
    status,
    body: {
      isOk: false,
      status,
      message: opts.isProd ? 'An unexpected error occurred' : err?.message || 'Internal Server Error',
      error: 'Internal Server Error',
      ...(requestId ? { requestId } : {}),
    },
  };
}

export default AppError;
