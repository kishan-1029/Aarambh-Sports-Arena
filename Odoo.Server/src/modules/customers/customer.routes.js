import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  customerCreateSchema,
  customerUpdateSchema,
  idParamsSchema,
} from './customer.schemas.js';
import * as customerService from './customer.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/customers',
  requireAuth,
  requirePermission('customer.view', 'member.view', 'invoice.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await customerService.list(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/customers/:id',
  requireAuth,
  requirePermission('customer.view', 'member.view', 'invoice.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await customerService.getById(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/customers',
  requireAuth,
  requirePermission('customer.create', 'member.create', 'invoice.create'),
  validate({ body: customerCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await customerService.create(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Customer created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/customers/:id',
  requireAuth,
  requirePermission('customer.edit', 'member.edit', 'invoice.manage'),
  validate({ params: idParamsSchema, body: customerUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await customerService.update(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Customer updated');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/customers/:id/archive',
  requireAuth,
  requirePermission('customer.edit', 'member.edit', 'invoice.manage'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await customerService.archive(req.params.id, req.ctx);
      return ok(res, data, 'Customer archived');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
