import { EventEmitter } from 'node:events';
import { logger } from '../lib/logger.js';

const bus = new EventEmitter();
bus.setMaxListeners(50);

/**
 * Emit immediately (use only outside transactions).
 * @param {string} event
 * @param {unknown} payload
 */
export function emit(event, payload) {
  bus.emit(event, payload);
}

/**
 * Emit domain events after a successful commit. Never call inside withTransaction.
 * @param {string} event
 * @param {unknown} payload
 */
export function emitAfterCommit(event, payload) {
  queueMicrotask(() => {
    try {
      bus.emit(event, payload);
    } catch (err) {
      logger.error({ err, event }, 'emitAfterCommit handler failed');
    }
  });
}

/**
 * @param {string} event
 * @param {(payload: unknown) => void} handler
 */
export function on(event, handler) {
  bus.on(event, handler);
  return () => bus.off(event, handler);
}

export function once(event, handler) {
  bus.once(event, handler);
}

export default { emit, emitAfterCommit, on, once, bus };
