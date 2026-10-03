import { randomUUID } from 'node:crypto';

/**
 * Attach request id from x-request-id or generate one.
 */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
  req.id = id;
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

export default requestId;
