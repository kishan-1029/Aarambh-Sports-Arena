import { Invoice } from './invoice.model.js';
import { Tax } from '../settings/tax.model.js';
import { Customer } from '../customers/customer.model.js';
import { computeLine, sum } from '../../lib/money.js';
import { toLocalDate } from '../../lib/time.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { NotFound, Validation, Conflict } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { buildInvoicePdf } from '../../lib/pdf.js';
import { Settings } from '../settings/settings.model.js';

/**
 * Financial year label for IST (April–March): e.g. 2026-04-01 → "2026-27"
 * @param {Date} [date]
 */
export function financialYearKey(date = new Date()) {
  const local = toLocalDate(date); // YYYY-MM-DD IST
  const [yStr, mStr] = local.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (m >= 4) {
    const next = String(y + 1).slice(-2);
    return `${y}-${next}`;
  }
  const prev = y - 1;
  const yy = String(y).slice(-2);
  return `${prev}-${yy}`;
}

/**
 * @param {import('mongoose').Types.ObjectId|string|null|undefined} taxId
 * @param {Map<string, object>} cache
 */
async function loadTax(taxId, cache) {
  if (!taxId) return null;
  const key = String(taxId);
  if (cache.has(key)) return cache.get(key);
  const tax = await Tax.findById(taxId).lean();
  cache.set(key, tax);
  return tax;
}

/**
 * Build computed lines + totals from input lines (server-side recompute).
 * @param {Array<{ description: string, revenueStream?: string, qty: number, unitPricePaise: number, discountPct?: number, taxId?: string }>} inputLines
 */
export async function buildComputedLines(inputLines) {
  if (!Array.isArray(inputLines) || inputLines.length === 0) {
    throw Validation([{ path: 'lines', message: 'At least one line required' }]);
  }

  const taxCache = new Map();
  const lines = [];

  for (const raw of inputLines) {
    const qty = Number(raw.qty);
    const unitPricePaise = Number(raw.unitPricePaise);
    if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) {
      throw Validation([{ path: 'unitPricePaise', message: 'Must be integer paise >= 0' }]);
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw Validation([{ path: 'qty', message: 'Must be non-negative integer' }]);
    }

    const taxDoc = await loadTax(raw.taxId, taxCache);
    const taxComponents = taxDoc?.components?.length
      ? taxDoc.components.map((c) => ({ name: c.name, ratePct: c.ratePct }))
      : taxDoc
        ? [{ name: taxDoc.name, ratePct: taxDoc.ratePct }]
        : [];

    const computed = computeLine({
      unitPricePaise,
      qty,
      discountPct: raw.discountPct || 0,
      tax: taxComponents,
    });

    lines.push({
      description: raw.description,
      revenueStream: raw.revenueStream || 'other',
      qty: computed.qty,
      unitPricePaise: computed.unitPricePaise,
      discountPaise: computed.discountPaise,
      discountPct: computed.discountPct,
      taxId: raw.taxId || null,
      taxPaise: computed.taxPaise,
      taxBreakdown: computed.taxComponents.map((c) => ({
        name: c.name,
        ratePct: c.ratePct,
        amountPaise: c.amountPaise,
      })),
      totalPaise: computed.totalPaise,
    });
  }

  const subtotalPaise = sum(...lines.map((l) => l.unitPricePaise * l.qty));
  const discountPaise = sum(...lines.map((l) => l.discountPaise));
  const taxPaise = sum(...lines.map((l) => l.taxPaise));
  const totalPaise = sum(...lines.map((l) => l.totalPaise));

  return {
    lines,
    totals: {
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise,
      paidPaise: 0,
      duePaise: totalPaise,
    },
  };
}

/**
 * Allocate next invoice / credit note / bill number for FY.
 * @param {'customer_invoice'|'vendor_bill'|'credit_note'} kind
 * @param {{ session?: import('mongoose').ClientSession }} [opts]
 */
export async function allocateInvoiceNumber(kind, opts = {}) {
  const fy = financialYearKey();
  const prefixes = {
    customer_invoice: 'INV',
    vendor_bill: 'BILL',
    credit_note: 'CN',
  };
  const prefix = prefixes[kind] || 'INV';
  const counterKey = `invoice:${kind}:${fy}`;
  const format = `${prefix}/${fy}/{SEQ:5}`;
  return nextNumber(counterKey, format, opts);
}

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) {
    return { type: 'system', name: ctx?.user?.name || 'system' };
  }
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

/**
 * Create draft or immediately post an invoice.
 * @param {{
 *   customerId: string,
 *   lines: object[],
 *   kind?: string,
 *   sourceType?: string,
 *   sourceId?: string,
 *   locationId?: string,
 *   dueDate?: string|Date,
 *   notes?: string,
 *   post?: boolean,
 *   isDemo?: boolean,
 * }} input
 * @param {object} [ctx]
 */
export async function createAndPost(input, ctx = {}) {
  const customer = await Customer.findById(input.customerId).lean();
  if (!customer || customer.archivedAt) {
    throw NotFound('Customer');
  }

  const { lines, totals } = await buildComputedLines(input.lines);
  const kind = input.kind || 'customer_invoice';
  const shouldPost = input.post !== false;

  const invoice = await withTransaction(async (session) => {
    const number = await allocateInvoiceNumber(kind, { session });
    const now = new Date();
    const localDate = toLocalDate(now);

    const [doc] = await Invoice.create(
      [
        {
          number,
          kind,
          customerId: input.customerId,
          locationId: input.locationId || null,
          sourceType: input.sourceType || 'manual',
          sourceId: input.sourceId || null,
          lines,
          totals,
          issueDate: now,
          dueDate: input.dueDate ? new Date(input.dueDate) : now,
          localDate,
          status: shouldPost ? 'posted' : 'draft',
          notes: input.notes || '',
          isDemo: Boolean(input.isDemo),
        },
      ],
      { session },
    );

    return doc;
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: shouldPost ? 'invoice.createAndPost' : 'invoice.create',
    entity: { type: 'invoice', id: String(invoice._id), label: invoice.number },
    after: { number: invoice.number, status: invoice.status, totalPaise: invoice.totals.totalPaise },
    requestId: ctx.requestId,
    ip: ctx.ip,
  });

  return invoice.toObject ? invoice.toObject() : invoice;
}

/**
 * Post a draft invoice (immutable thereafter except payment fields).
 */
export async function post(invoiceId, ctx = {}) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw NotFound('Invoice');
  if (invoice.status !== 'draft') {
    throw Conflict('INVOICE_NOT_DRAFT', 'Only draft invoices can be posted');
  }

  invoice.status = 'posted';
  await invoice.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'invoice.post',
    entity: { type: 'invoice', id: String(invoice._id), label: invoice.number },
    after: { status: 'posted' },
    requestId: ctx.requestId,
  });

  return invoice.toObject();
}

/**
 * Create a credit note that reverses a posted invoice (full or partial by lines).
 * @param {string} invoiceId
 * @param {{ reason?: string, amountPaise?: number }} [opts]
 * @param {object} [ctx]
 */
export async function creditNote(invoiceId, opts = {}, ctx = {}) {
  const original = await Invoice.findById(invoiceId);
  if (!original) throw NotFound('Invoice');
  if (!['posted', 'partially_paid', 'paid'].includes(original.status)) {
    throw Conflict('INVOICE_NOT_POSTED', 'Credit notes require a posted invoice');
  }
  if (original.kind === 'credit_note') {
    throw Conflict('INVALID_CREDIT_NOTE', 'Cannot credit a credit note');
  }

  const existingCn = await Invoice.findOne({
    reversalOfId: original._id,
    kind: 'credit_note',
    status: { $ne: 'void' },
  }).lean();
  if (existingCn && opts.amountPaise == null) {
    throw Conflict('ALREADY_CREDITED', 'Invoice already has a full credit note', {
      creditNoteId: String(existingCn._id),
    });
  }

  const cn = await withTransaction(async (session) => {
    const number = await allocateInvoiceNumber('credit_note', { session });
    const now = new Date();

    // Reverse lines (negative totals) — full reverse of original lines
    const lines = original.lines.map((l) => ({
      description: `CN: ${l.description}`,
      revenueStream: l.revenueStream,
      qty: l.qty,
      unitPricePaise: -Math.abs(l.unitPricePaise),
      discountPaise: -Math.abs(l.discountPaise),
      discountPct: l.discountPct,
      taxId: l.taxId,
      taxPaise: -Math.abs(l.taxPaise),
      taxBreakdown: (l.taxBreakdown || []).map((t) => ({
        name: t.name,
        ratePct: t.ratePct,
        amountPaise: -Math.abs(t.amountPaise),
      })),
      totalPaise: -Math.abs(l.totalPaise),
    }));

    const totalPaise = -Math.abs(original.totals.totalPaise);
    const totals = {
      subtotalPaise: -Math.abs(original.totals.subtotalPaise),
      discountPaise: -Math.abs(original.totals.discountPaise),
      taxPaise: -Math.abs(original.totals.taxPaise),
      totalPaise,
      paidPaise: 0,
      duePaise: 0,
    };

    const [doc] = await Invoice.create(
      [
        {
          number,
          kind: 'credit_note',
          customerId: original.customerId,
          locationId: original.locationId,
          sourceType: original.sourceType,
          sourceId: original.sourceId,
          lines,
          totals,
          issueDate: now,
          dueDate: now,
          localDate: toLocalDate(now),
          status: 'posted',
          reversalOfId: original._id,
          notes: opts.reason || `Credit note for ${original.number}`,
          isDemo: original.isDemo,
        },
      ],
      { session },
    );

    // Zero out due on original when full credit
    original.totals.duePaise = 0;
    original.totals.paidPaise = original.totals.totalPaise;
    original.status = 'void';
    original.markModified('totals');
    await original.save({ session });

    return doc;
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'invoice.creditNote',
    entity: { type: 'invoice', id: String(cn._id), label: cn.number },
    before: { originalId: String(original._id), originalNumber: original.number },
    after: { number: cn.number, totalPaise: cn.totals.totalPaise },
    reason: opts.reason,
    requestId: ctx.requestId,
  });

  return cn.toObject ? cn.toObject() : cn;
}

/**
 * Apply payment amounts to invoice paid/due/status. Called inside payment.service txn.
 */
export async function applyPaymentToInvoice(invoice, amountPaise, session) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw Validation([{ path: 'amountPaise', message: 'Must be positive integer paise' }]);
  }
  if (!['posted', 'partially_paid'].includes(invoice.status)) {
    throw Conflict('INVOICE_NOT_PAYABLE', `Cannot pay invoice in status ${invoice.status}`);
  }
  if (amountPaise > invoice.totals.duePaise) {
    throw Conflict('OVERPAYMENT', 'Payment exceeds amount due', {
      duePaise: invoice.totals.duePaise,
      amountPaise,
    });
  }

  invoice.totals.paidPaise += amountPaise;
  invoice.totals.duePaise = invoice.totals.totalPaise - invoice.totals.paidPaise;
  if (invoice.totals.duePaise === 0) {
    invoice.status = 'paid';
  } else {
    invoice.status = 'partially_paid';
  }
  invoice.markModified('totals');
  await invoice.save({ session });
  return invoice;
}

export async function getById(id) {
  const inv = await Invoice.findById(id).populate('customerId', 'name email phone').lean();
  if (!inv) throw NotFound('Invoice');
  return inv;
}

export async function pdfBuffer(invoiceId) {
  const inv = await Invoice.findById(invoiceId).populate('customerId', 'name').lean();
  if (!inv) throw NotFound('Invoice');
  const settings = await Settings.findOne().sort({ createdAt: 1 }).lean();
  return buildInvoicePdf({
    number: inv.number,
    clubName: settings?.clubName || 'Arambh Sports Arena',
    customerName: inv.customerId?.name,
    localDate: inv.localDate,
    status: inv.status,
    lines: inv.lines,
    totals: inv.totals,
  });
}

export default {
  financialYearKey,
  buildComputedLines,
  allocateInvoiceNumber,
  createAndPost,
  post,
  creditNote,
  applyPaymentToInvoice,
  getById,
  pdfBuffer,
};
