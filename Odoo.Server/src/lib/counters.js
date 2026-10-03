import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter =
  mongoose.models.Counter || mongoose.model('Counter', counterSchema, 'counters');

/**
 * Atomically increment a counter and format the number.
 * format examples: "INV-{YYYY}-{SEQ:5}" → INV-2026-00042
 * Tokens: {YYYY}, {YY}, {SEQ}, {SEQ:n}
 * @param {string} key counter _id e.g. "invoice:2026"
 * @param {string} [format]
 * @param {{ session?: import('mongoose').ClientSession }} [opts]
 */
export async function nextNumber(key, format = '{SEQ}', opts = {}) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true, session: opts.session },
  );

  const seq = doc.seq;
  const year = new Date().getUTCFullYear();
  let out = format
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', String(year).slice(-2));

  out = out.replace(/\{SEQ(?::(\d+))?\}/g, (_, width) => {
    const w = width ? Number(width) : 0;
    return w > 0 ? String(seq).padStart(w, '0') : String(seq);
  });

  return out;
}

export default { Counter, nextNumber };
