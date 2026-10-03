/**
 * Injectable clock for tests and deterministic time logic.
 */

/** @type {{ now: () => Date }} */
let clockImpl = {
  now: () => new Date(),
};

/**
 * @returns {Date}
 */
export function now() {
  return clockImpl.now();
}

/**
 * @param {{ now: () => Date }} impl
 */
export function setClock(impl) {
  if (!impl || typeof impl.now !== 'function') {
    throw new TypeError('setClock expects { now: () => Date }');
  }
  clockImpl = impl;
}

export function resetClock() {
  clockImpl = { now: () => new Date() };
}

export default { now, setClock, resetClock };
