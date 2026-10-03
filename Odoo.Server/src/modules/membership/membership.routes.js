import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  planCreateSchema,
  planUpdateSchema,
  purchaseSchema,
  renewSchema,
  upgradeSchema,
  cancelSchema,
  idParamsSchema,
} from './membership.schemas.js';
import * as membershipService from './membership.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

// —— Plans ——
router.get(
  '/membership-plans',
  requireAuth,
  requirePermission('membership_plan.view', 'membership.view', 'member.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await membershipService.listPlans(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/membership-plans/:id',
  requireAuth,
  requirePermission('membership_plan.view', 'membership.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.getPlan(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/membership-plans',
  requireAuth,
  requirePermission('membership_plan.edit'),
  validate({ body: planCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.createPlan(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Plan created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/membership-plans/:id/archive',
  requireAuth,
  requirePermission('membership_plan.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.archivePlan(req.params.id, req.ctx);
      return ok(res, data, 'Plan removed');
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/membership-plans/:id',
  requireAuth,
  requirePermission('membership_plan.edit'),
  validate({ params: idParamsSchema, body: planUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.updatePlan(req.params.id, req.body, req.ctx);
      return ok(res, data, data.versioned ? 'Plan versioned' : 'Plan updated');
    } catch (err) {
      return next(err);
    }
  },
);

// —— Memberships ——
router.get(
  '/memberships',
  requireAuth,
  requirePermission('membership.view', 'member.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await membershipService.listMemberships(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships',
  requireAuth,
  requirePermission('membership.create'),
  validate({ body: purchaseSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.purchase(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Membership purchased', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships/reminders',
  requireAuth,
  requirePermission('membership.edit', 'membership.create'),
  async (req, res, next) => {
    try {
      const data = await membershipService.sendReminders();
      return ok(res, data, 'Reminders processed');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships/expire-due',
  requireAuth,
  requirePermission('membership.edit'),
  async (req, res, next) => {
    try {
      const data = await membershipService.expireDue();
      return ok(res, data, 'Expiry processed');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships/:id/renew',
  requireAuth,
  requirePermission('membership.create', 'membership.edit'),
  validate({ params: idParamsSchema, body: renewSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.renew(req.params.id, req.body.months, req.ctx);
      return ok(res, data, 'Membership renewed');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships/:id/upgrade',
  requireAuth,
  requirePermission('membership.edit'),
  validate({ params: idParamsSchema, body: upgradeSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.upgrade(req.params.id, req.body.planId, req.ctx);
      return ok(res, data, 'Membership upgraded');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/memberships/:id/cancel',
  requireAuth,
  requirePermission('membership.cancel'),
  validate({ params: idParamsSchema, body: cancelSchema }),
  async (req, res, next) => {
    try {
      const data = await membershipService.cancel(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Membership cancelled');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
