import { nanoid } from 'nanoid';

/**
 * Mock payment provider for local/demo (PAYMENTS_PROVIDER=mock).
 */
export const mockProvider = {
  name: 'mock',

  /**
   * @param {{ amountPaise: number, invoiceId?: string, metadata?: object }} input
   */
  async createIntent(input) {
    const intentId = `mock_${nanoid(16)}`;
    return {
      intentId,
      provider: 'mock',
      amountPaise: input.amountPaise,
      status: 'pending',
      clientSecret: `secret_${intentId}`,
      metadata: input.metadata || {},
    };
  },

  /**
   * @param {string} _payload
   * @param {string} _signature
   */
  verifySignature(_payload, _signature) {
    return true;
  },

  /**
   * @param {{ providerRef: string, amountPaise: number, reason?: string }} input
   */
  async refund(input) {
    return {
      providerRef: `mock_refund_${nanoid(12)}`,
      amountPaise: input.amountPaise,
      status: 'refunded',
      originalRef: input.providerRef,
      reason: input.reason || '',
    };
  },

  /**
   * @param {object} body
   */
  parseWebhook(body) {
    return {
      eventId: body?.id || body?.eventId || `mock_evt_${nanoid(10)}`,
      type: body?.event || body?.type || 'payment.captured',
      intentId: body?.payload?.intentId || body?.intentId,
      providerRef: body?.payload?.providerRef || body?.providerRef,
      status: body?.payload?.status || 'captured',
      amountPaise: body?.payload?.amountPaise,
    };
  },
};

export default mockProvider;
