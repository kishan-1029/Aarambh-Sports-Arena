import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  memberRegisterSchema,
  memberUpdateSchema,
  idParamsSchema,
  qrParamsSchema,
} from './member.schemas.js';
import * as memberService from './member.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/members',
  requireAuth,
  requirePermission('member.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await memberService.list(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/search',
  requireAuth,
  requirePermission('member.view'),
  async (req, res, next) => {
    try {
      const data = await memberService.search(req.query.q, {
        fullPhone: Boolean(req.query.fullPhone),
      });
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/by-qr/:token',
  requireAuth,
  requirePermission('member.view'),
  validate({ params: qrParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.getByQrToken(req.params.token);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/:id',
  requireAuth,
  requirePermission('member.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.getProfile(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/:id/timeline',
  requireAuth,
  requirePermission('member.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.timeline(req.params.id, {
        cursor: req.query.cursor,
        limit: Number(req.query.limit) || 25,
      });
      return ok(res, data.data, 'ok', data.meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/:id/qr',
  requireAuth,
  requirePermission('member.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const token = memberService.qrToken(req.params.id);
      return ok(res, { token, expiresInHours: 24 });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/members',
  requireAuth,
  requirePermission('member.create'),
  validate({ body: memberRegisterSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.register(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Member registered', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/members/:id',
  requireAuth,
  requirePermission('member.edit'),
  validate({ params: idParamsSchema, body: memberUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.update(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Member updated');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/members/:id/archive',
  requireAuth,
  requirePermission('member.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await memberService.archive(req.params.id, req.ctx);
      return ok(res, data, 'Member archived');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
