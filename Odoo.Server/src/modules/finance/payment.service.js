import { Payment } from './payment.model.js';
import { Invoice } from './invoice.model.js';
import { applyPaymentToInvoice, creditNote } from './invoice.service.js';
import { getPaymentProvider } from './providers/index.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { toLocalDate } from '../../lib/time.js';
import { NotFound, Validation, Conflict, AppError } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { financialYearKey } from './invoice.service.js';
import { config } from '../../config/index.js';

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

async function allocatePaymentNo(opts = {}) {
  const fy = financialYearKey();
  return nextNumber(`payment:${fy}`, `PAY/${fy}/{SEQ:5}`, opts);
}

/**
 * Record a payment against one or more invoices (manual / cash / card / UPI / mock confirm).
 * Provider calls happen outside the transaction when creating online intents.
 *
 * @param {{
 *   invoiceId: string,
 *   amountPaise: number,
 *   method: string,
 *   provider?: string,
 *   providerRef?: string,
 *   capture?: boolean,
 *   isDemo?: boolean,
 * }} input
 * @param {object} [ctx]
 */
export async function record(input, ctx = {}) {
  const amountPaise = Number(input.amountPaise);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw Validation([{ path: 'amountPaise', message: 'Must be positive integer paise' }]);
  }

  const method = input.method || 'cash';
  const provider =
    input.provider ||
    (method === 'online' ? config.paymentsProvider || 'mock' : 'manual');
  const capture = input.capture !== false;

  // Online pending intent path (mock/razorpay) — create intent outside txn first
  if (method === 'online' && !capture && !input.providerRef) {
    const invoice = await Invoice.findById(input.invoiceId);
    if (!invoice) throw NotFound('Invoice');
    if (!['posted', 'partially_paid'].includes(invoice.status)) {
      throw Conflict('INVOICE_NOT_PAYABLE', `Cannot pay invoice in status ${invoice.status}`);
    }
    if (amountPaise > invoice.totals.duePaise) {
      throw Conflict('OVERPAYMENT', 'Payment exceeds amount due', {
        duePaise: invoice.totals.duePaise,
      });
    }

    const providerDriver = getPaymentProvider(provider);
    const intent = await providerDriver.createIntent({
      amountPaise,
      invoiceId: String(invoice._id),
      metadata: { invoiceNumber: invoice.number },
    });

    const payment = await withTransaction(async (session) => {
      const paymentNo = await allocatePaymentNo({ session });
      const now = new Date();
      const [doc] = await Payment.create(
        [
          {
            paymentNo,
            direction: 'in',
            method,
            amountPaise,
            provider,
            intentId: intent.intentId,
            status: 'pending',
            invoiceIds: [invoice._id],
            sourceType: 'invoice',
            sourceId: invoice._id,
            receivedBy: ctx?.user?.name || '',
            at: now,
            localDate: toLocalDate(now),
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
      action: 'payment.intent',
      entity: { type: 'payment', id: String(payment._id), label: payment.paymentNo },
      after: { intentId: intent.intentId, amountPaise, status: 'pending' },
      requestId: ctx.requestId,
    });

    return {
      ...(payment.toObject ? payment.toObject() : payment),
      intent,
    };
  }

  // Captured / manual record
  const payment = await withTransaction(async (session) => {
    const invoice = await Invoice.findById(input.invoiceId).session(session);
    if (!invoice) throw NotFound('Invoice');

    await applyPaymentToInvoice(invoice, amountPaise, session);

    const paymentNo = await allocatePaymentNo({ session });
    const now = new Date();
    const providerRef =
      input.providerRef ||
      `${provider}_cap_${paymentNo.replace(/\//g, '_')}_${Date.now()}`;

    const payload = {
      paymentNo,
      direction: 'in',
      method,
      amountPaise,
      provider,
      providerRef,
      status: 'captured',
      invoiceIds: [invoice._id],
      sourceType: 'invoice',
      sourceId: invoice._id,
      receivedBy: ctx?.user?.name || '',
      at: now,
      localDate: toLocalDate(now),
      isDemo: Boolean(input.isDemo),
    };
    if (input.intentId) payload.intentId = input.intentId;

    const [doc] = await Payment.create([payload], { session });

    return { payment: doc, invoice };
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'payment.record',
    entity: {
      type: 'payment',
      id: String(payment.payment._id),
      label: payment.payment.paymentNo,
    },
    after: {
      amountPaise,
      method,
      invoiceId: String(input.invoiceId),
      invoiceStatus: payment.invoice.status,
    },
    requestId: ctx.requestId,
  });

  return payment.payment.toObject ? payment.payment.toObject() : payment.payment;
}

/**
 * Confirm a pending mock/online payment by intentId (demo succeed path).
 */
export async function confirmIntent(intentId, opts = {}, ctx = {}) {
  const payment = await Payment.findOne({ intentId });
  if (!payment) throw NotFound('Payment intent');
  if (payment.status === 'captured') {
    return payment.toObject(); // idempotent
  }
  if (payment.status !== 'pending') {
    throw Conflict('PAYMENT_NOT_PENDING', `Payment status is ${payment.status}`);
  }

  if (opts.fail) {
    payment.status = 'failed';
    await payment.save();
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'system',
      action: 'payment.failed',
      entity: { type: 'payment', id: String(payment._id), label: payment.paymentNo },
      requestId: ctx.requestId,
    });
    return payment.toObject();
  }

  const updated = await withTransaction(async (session) => {
    const p = await Payment.findById(payment._id).session(session);
    if (p.status === 'captured') return p;
    const invoiceId = p.invoiceIds[0];
    const invoice = await Invoice.findById(invoiceId).session(session);
    if (!invoice) throw NotFound('Invoice');
    await applyPaymentToInvoice(invoice, p.amountPaise, session);
    p.status = 'captured';
    p.providerRef = opts.providerRef || `mock_cap_${p.intentId}`;
    p.at = new Date();
    await p.save({ session });
    return p;
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'system',
    action: 'payment.captured',
    entity: { type: 'payment', id: String(updated._id), label: updated.paymentNo },
    after: { intentId, status: 'captured' },
    requestId: ctx.requestId,
  });

  return updated.toObject();
}

/**
 * Refund a captured payment — credit note + provider refund + audit.
 * @param {string} paymentId
 * @param {{ amountPaise?: number, reason?: string }} [opts]
 * @param {object} [ctx]
 */
export async function refund(paymentId, opts = {}, ctx = {}) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw NotFound('Payment');
  if (payment.status !== 'captured' && payment.status !== 'partially_refunded') {
    throw Conflict('PAYMENT_NOT_REFUNDABLE', `Cannot refund status ${payment.status}`);
  }

  const alreadyRefunded = (payment.refunds || []).reduce((a, r) => a + r.amountPaise, 0);
  const amountPaise = opts.amountPaise != null ? Number(opts.amountPaise) : payment.amountPaise - alreadyRefunded;
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw Validation([{ path: 'amountPaise', message: 'Must be positive integer paise' }]);
  }
  if (amountPaise > payment.amountPaise - alreadyRefunded) {
    throw Conflict('REFUND_EXCEEDS', 'Refund exceeds remaining captured amount');
  }

  // Provider refund outside transaction
  const providerDriver = getPaymentProvider(payment.provider === 'manual' ? 'mock' : payment.provider);
  const providerResult = await providerDriver.refund({
    providerRef: payment.providerRef || payment.intentId || payment.paymentNo,
    amountPaise,
    reason: opts.reason,
  });

  const invoiceId = payment.invoiceIds?.[0];
  let cn = null;
  if (invoiceId) {
    const inv = await Invoice.findById(invoiceId);
    if (inv && inv.kind !== 'credit_note' && inv.status !== 'void') {
      // Full refund of invoice total → credit note; partial just notes on payment
      if (amountPaise >= inv.totals.totalPaise || amountPaise >= payment.amountPaise) {
        try {
          cn = await creditNote(
            String(invoiceId),
            { reason: opts.reason || `Refund ${payment.paymentNo}` },
            ctx,
          );
        } catch (err) {
          if (err?.code !== 'ALREADY_CREDITED') throw err;
        }
      }
    }
  }

  payment.refunds.push({
    amountPaise,
    at: new Date(),
    providerRef: providerResult.providerRef,
    reason: opts.reason || '',
    by: ctx?.user?.name || '',
  });
  const totalRefunded = payment.refunds.reduce((a, r) => a + r.amountPaise, 0);
  payment.status =
    totalRefunded >= payment.amountPaise ? 'refunded' : 'partially_refunded';
  await payment.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'payment.refund',
    entity: { type: 'payment', id: String(payment._id), label: payment.paymentNo },
    after: { amountPaise, status: payment.status, creditNoteId: cn?._id },
    reason: opts.reason,
    requestId: ctx.requestId,
  });

  return { payment: payment.toObject(), creditNote: cn, providerResult };
}

/**
 * Idempotent webhook handler by event id (stored as providerRef on synthetic log via Payment update).
 */
const seenWebhookEvents = new Set(); // process-local; durable store can follow later

export async function handleWebhookEvent(parsed, ctx = {}) {
  if (parsed.eventId && seenWebhookEvents.has(parsed.eventId)) {
    return { duplicate: true, eventId: parsed.eventId };
  }
  if (parsed.eventId) seenWebhookEvents.add(parsed.eventId);

  if (parsed.intentId && (parsed.status === 'captured' || parsed.type?.includes('captured'))) {
    const result = await confirmIntent(
      parsed.intentId,
      { providerRef: parsed.providerRef },
      { ...ctx, source: 'webhook' },
    );
    return { duplicate: false, payment: result };
  }

  return { duplicate: false, ignored: true, parsed };
}

export default { record, confirmIntent, refund, handleWebhookEvent };
