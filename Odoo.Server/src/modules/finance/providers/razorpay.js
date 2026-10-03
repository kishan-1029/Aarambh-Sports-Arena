/**
 * Razorpay provider stub — real SDK wiring in a later phase.
 * Signature verification and API calls are placeholders.
 */
import { nanoid } from 'nanoid';
import { AppError } from '../../../lib/errors.js';

export const razorpayProvider = {
  name: 'razorpay',

  async createIntent(input) {
    // Stub: no live Razorpay call until keys configured.
    const intentId = `rzp_stub_${nanoid(12)}`;
    return {
      intentId,
      provider: 'razorpay',
      amountPaise: input.amountPaise,
      status: 'pending',
      clientSecret: null,
      metadata: { stub: true, ...(input.metadata || {}) },
    };
  },

  /**
   * @param {string} _payload
   * @param {string} _signature
   */
  verifySignature(_payload, _signature) {
    // Stub accepts only when RAZORPAY_WEBHOOK_SECRET is unset (dev).
    // Production must implement HMAC SHA256 verification.
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(
        'PAYMENT_FAILED',
        'Razorpay signature verification not configured — use mock provider',
        402,
      );
    }
    return true;
  },

  async refund(input) {
    return {
      providerRef: `rzp_refund_stub_${nanoid(10)}`,
      amountPaise: input.amountPaise,
      status: 'refunded',
      originalRef: input.providerRef,
      reason: input.reason || '',
      stub: true,
    };
  },

  parseWebhook(body) {
    const entity = body?.payload?.payment?.entity || body?.payload || {};
    return {
      eventId: body?.id || entity.id || `rzp_evt_${nanoid(10)}`,
      type: body?.event || 'payment.captured',
      intentId: entity.order_id || entity.notes?.intentId,
      providerRef: entity.id,
      status: entity.status === 'captured' ? 'captured' : entity.status || 'pending',
      amountPaise: typeof entity.amount === 'number' ? entity.amount : undefined,
    };
  },
};

export default razorpayProvider;
