import { Router } from 'express';
import { getPaymentProvider } from './providers/index.js';
import { confirmIntent, handleWebhookEvent } from './payment.service.js';
import { validate } from '../../middleware/validate.js';
import { intentParamsSchema } from './finance.schemas.js';
import { config } from '../../config/index.js';
import { AppError } from '../../lib/errors.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';

const router = Router();

/**
 * Razorpay webhook stub — verifies signature via provider, idempotent on event id.
 * Auth: webhook signature (W), not session.
 */
router.post('/webhooks/razorpay', async (req, res, next) => {
  try {
    const provider = getPaymentProvider('razorpay');
    const signature = req.headers['x-razorpay-signature'] || '';
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    provider.verifySignature(raw, signature);
    const parsed = provider.parseWebhook(req.body || {});
    const result = await handleWebhookEvent(parsed, { source: 'webhook' });
    return res.status(200).json({ isOk: true, status: 200, message: 'ok', data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * Mock payment succeed/fail — demo only when PAYMENTS_PROVIDER=mock.
 * Staff auth required so random clients can't flip payments.
 */
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

router.post(
  '/payments/mock/:intentId/succeed',
  requireAuth,
  requirePermission('payment.create', 'invoice.manage'),
  validate({ params: intentParamsSchema }),
  async (req, res, next) => {
    try {
      if (config.paymentsProvider !== 'mock') {
        throw new AppError('FORBIDDEN', 'Mock payments disabled', 403);
      }
      const data = await confirmIntent(req.params.intentId, {}, req.ctx);
      return res.status(200).json({ isOk: true, status: 200, message: 'Payment captured', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/payments/mock/:intentId/fail',
  requireAuth,
  requirePermission('payment.create', 'invoice.manage'),
  validate({ params: intentParamsSchema }),
  async (req, res, next) => {
    try {
      if (config.paymentsProvider !== 'mock') {
        throw new AppError('FORBIDDEN', 'Mock payments disabled', 403);
      }
      const data = await confirmIntent(req.params.intentId, { fail: true }, req.ctx);
      return res.status(200).json({ isOk: true, status: 200, message: 'Payment failed', data });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
