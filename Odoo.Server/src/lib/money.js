/**
 * Integer paise helpers. Never use floats for money storage.
 */

/**
 * @param {number|string} rupees
 * @returns {number}
 */
export function toPaise(rupees) {
  const n = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (!Number.isFinite(n)) throw new TypeError('toPaise: invalid amount');
  return Math.round(n * 100);
}

/**
 * @param {number} paise
 * @returns {string}
 */
export function formatINR(paise) {
  if (!Number.isInteger(paise)) throw new TypeError('formatINR: paise must be integer');
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}₹${rupees}.${String(rem).padStart(2, '0')}`;
}

/**
 * Percentage of paise, round half-up to integer.
 * @param {number} paise
 * @param {number} pctPercent e.g. 18 for 18%
 */
export function pct(paise, pctPercent) {
  if (!Number.isInteger(paise)) throw new TypeError('pct: paise must be integer');
  const raw = (paise * pctPercent) / 100;
  return Math.round(raw);
}

/**
 * @param {...number} values
 */
export function sum(...values) {
  let total = 0;
  for (const v of values) {
    if (!Number.isInteger(v)) throw new TypeError('sum: all values must be integers');
    total += v;
  }
  return total;
}

/**
 * Split `totalPaise` into `parts` equal shares; residue goes to the last part.
 * @param {number} totalPaise
 * @param {number} parts
 * @returns {number[]}
 */
export function splitResidue(totalPaise, parts) {
  if (!Number.isInteger(totalPaise)) throw new TypeError('splitResidue: total must be integer');
  if (!Number.isInteger(parts) || parts < 1) throw new TypeError('splitResidue: parts must be >= 1');
  const base = Math.floor(totalPaise / parts);
  const rem = totalPaise - base * parts;
  const out = Array.from({ length: parts }, () => base);
  out[parts - 1] += rem;
  return out;
}

/**
 * Tax-exclusive line: base → discount → taxable → tax components → total.
 * @param {{ unitPricePaise: number, qty: number, discountPct?: number, tax?: { ratePct: number, name?: string }[] }} input
 */
export function computeLine({ unitPricePaise, qty, discountPct = 0, tax = [] }) {
  if (!Number.isInteger(unitPricePaise)) throw new TypeError('unitPricePaise must be integer');
  if (!Number.isInteger(qty) || qty < 0) throw new TypeError('qty must be non-negative integer');

  const basePaise = unitPricePaise * qty;
  const discountPaise = pct(basePaise, discountPct);
  const taxablePaise = basePaise - discountPaise;

  const taxComponents = (tax || []).map((t) => {
    const amountPaise = pct(taxablePaise, t.ratePct);
    return { name: t.name || 'TAX', ratePct: t.ratePct, amountPaise };
  });
  const taxPaise = taxComponents.reduce((a, c) => a + c.amountPaise, 0);
  const totalPaise = taxablePaise + taxPaise;

  return {
    unitPricePaise,
    qty,
    basePaise,
    discountPct,
    discountPaise,
    taxablePaise,
    taxComponents,
    taxPaise,
    totalPaise,
  };
}

export default { toPaise, formatINR, pct, sum, splitResidue, computeLine };
