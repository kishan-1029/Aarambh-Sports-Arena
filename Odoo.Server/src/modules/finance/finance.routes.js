import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  invoiceCreateSchema,
  creditNoteSchema,
  recordPaymentSchema,
  refundSchema,
  idParamsSchema,
} from './finance.schemas.js';
import * as invoiceService from './invoice.service.js';
import * as paymentService from './payment.service.js';
import { Invoice } from './invoice.model.js';
import { Payment } from './payment.model.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { config } from '../../config/index.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/invoices',
  requireAuth,
  requirePermission('invoice.view'),
  async (req, res, next) => {
    try {
      const parsed = parseListQuery(req, {
        allowedSort: ['issueDate', '-issueDate', 'number', '-number', 'createdAt', '-createdAt'],
        defaultSort: '-issueDate',
        searchFields: ['number', 'notes'],
        buildFilter: (q) => {
          const f = {};
          if (q.status) f.status = q.status;
          if (q.kind) f.kind = q.kind;
          if (q.customerId) f.customerId = q.customerId;
          // Bifurcate POS vs E-com vs membership/booking
          if (q.sourceType) f.sourceType = q.sourceType;
          if (q.channel === 'ecom' || q.channel === 'ecommerce') {
            f.sourceType = 'order';
          } else if (q.channel === 'pos') {
            f.sourceType = 'pos_order';
          } else if (q.channel === 'membership') {
            f.sourceType = 'membership';
          } else if (q.channel === 'booking') {
            f.sourceType = 'booking';
          } else if (q.channel === 'other') {
            f.sourceType = { $nin: ['order', 'pos_order', 'membership', 'booking'] };
          }
          return f;
        },
      });
      const { data, meta } = await runListQuery(Invoice, parsed, {
        populate: { path: 'customerId', select: 'name email phone tags' },
      });
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/invoices',
  requireAuth,
  requirePermission('invoice.create'),
  validate({ body: invoiceCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await invoiceService.createAndPost(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Invoice created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/invoices/:id',
  requireAuth,
  requirePermission('invoice.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await invoiceService.getById(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/invoices/:id/pdf',
  requireAuth,
  requirePermission('invoice.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const buf = await invoiceService.pdfBuffer(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${req.params.id}.pdf"`,
      );
      return res.send(buf);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/invoices/:id/post',
  requireAuth,
  requirePermission('invoice.manage', 'invoice.create'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await invoiceService.post(req.params.id, req.ctx);
      return ok(res, data, 'Invoice posted');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/invoices/:id/credit-note',
  requireAuth,
  requirePermission('invoice.manage'),
  validate({ params: idParamsSchema, body: creditNoteSchema }),
  async (req, res, next) => {
    try {
      const data = await invoiceService.creditNote(req.params.id, req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Credit note created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/invoices/:id/record-payment',
  requireAuth,
  requirePermission('payment.create', 'invoice.manage'),
  validate({ params: idParamsSchema, body: recordPaymentSchema }),
  async (req, res, next) => {
    try {
      const data = await paymentService.record(
        { ...req.body, invoiceId: req.params.id },
        req.ctx,
      );
      return res.status(201).json({ isOk: true, status: 201, message: 'Payment recorded', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/payments',
  requireAuth,
  requirePermission('invoice.view', 'payment.manage'),
  async (req, res, next) => {
    try {
      const parsed = parseListQuery(req, {
        allowedSort: ['at', '-at', 'createdAt', '-createdAt', 'paymentNo', '-paymentNo'],
        defaultSort: '-at',
        searchFields: ['paymentNo', 'providerRef'],
        buildFilter: (q) => {
          const f = {};
          if (q.status) f.status = q.status;
          if (q.method) f.method = q.method;
          if (q.channel === 'pos') {
            f.posSessionId = { $ne: null };
          } else if (q.channel === 'ecom' || q.channel === 'ecommerce') {
            f.sourceType = 'shop_order';
          }
          return f;
        },
      });
      const { data, meta } = await runListQuery(Payment, parsed, {
        populate: { path: 'invoiceIds', select: 'number sourceType' },
      });
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/payments/:id/refund',
  requireAuth,
  requirePermission('payment.manage', 'invoice.manage'),
  validate({ params: idParamsSchema, body: refundSchema }),
  async (req, res, next) => {
    try {
      const data = await paymentService.refund(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Refund processed');
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/payments/settings',
  requireAuth,
  requirePermission('settings.manage', 'payment.manage'),
  async (_req, res) => {
    return ok(res, {
      provider: config.paymentsProvider,
      methods: ['cash', 'card', 'upi', 'online', 'wallet', 'bank_transfer'],
    });
  },
);

export default router;
