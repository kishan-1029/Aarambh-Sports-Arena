/**
 * Shared money helpers (paise). Keep in sync with Odoo.Server/src/lib/money.js.
 */

export function toPaise(rupees) {
  const n = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (!Number.isFinite(n)) throw new TypeError('toPaise: invalid amount');
  return Math.round(n * 100);
}

export function formatINR(paise) {
  if (!Number.isInteger(paise)) throw new TypeError('formatINR: paise must be integer');
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}₹${rupees}.${String(rem).padStart(2, '0')}`;
}

export function pct(paise, pctPercent) {
  if (!Number.isInteger(paise)) throw new TypeError('pct: paise must be integer');
  return Math.round((paise * pctPercent) / 100);
}

export function sum(...values) {
  let total = 0;
  for (const v of values) {
    if (!Number.isInteger(v)) throw new TypeError('sum: all values must be integers');
    total += v;
  }
  return total;
}

export function splitResidue(totalPaise, parts) {
  if (!Number.isInteger(totalPaise)) throw new TypeError('splitResidue: total must be integer');
  if (!Number.isInteger(parts) || parts < 1) throw new TypeError('splitResidue: parts must be >= 1');
  const base = Math.floor(totalPaise / parts);
  const rem = totalPaise - base * parts;
  const out = Array.from({ length: parts }, () => base);
  out[parts - 1] += rem;
  return out;
}

export function computeLine({ unitPricePaise, qty, discountPct = 0, tax = [] }) {
  if (!Number.isInteger(unitPricePaise)) throw new TypeError('unitPricePaise must be integer');
  if (!Number.isInteger(qty) || qty < 0) throw new TypeError('qty must be non-negative integer');
  const basePaise = unitPricePaise * qty;
  const discountPaise = pct(basePaise, discountPct);
  const taxablePaise = basePaise - discountPaise;
  const taxComponents = (tax || []).map((t) => ({
    name: t.name || 'TAX',
    ratePct: t.ratePct,
    amountPaise: pct(taxablePaise, t.ratePct),
  }));
  const taxPaise = taxComponents.reduce((a, c) => a + c.amountPaise, 0);
  return {
    unitPricePaise,
    qty,
    basePaise,
    discountPct,
    discountPaise,
    taxablePaise,
    taxComponents,
    taxPaise,
    totalPaise: taxablePaise + taxPaise,
  };
}
