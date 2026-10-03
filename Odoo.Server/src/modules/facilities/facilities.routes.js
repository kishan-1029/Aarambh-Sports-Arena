import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  idParamsSchema,
  sportCreateSchema,
  sportUpdateSchema,
  courtCreateSchema,
  courtUpdateSchema,
  courtBlockCreateSchema,
} from './facilities.schemas.js';
import * as facilities from './facilities.service.js';
import * as courtBlockService from '../booking/courtBlock.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/sports',
  requireAuth,
  requirePermission('court.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await facilities.listSports(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/sports',
  requireAuth,
  requirePermission('court.manage'),
  validate({ body: sportCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await facilities.createSport(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/sports/:id',
  requireAuth,
  requirePermission('court.manage'),
  validate({ params: idParamsSchema, body: sportUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await facilities.updateSport(req.params.id, req.body, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/courts',
  requireAuth,
  requirePermission('court.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await facilities.listCourts(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/courts/:id',
  requireAuth,
  requirePermission('court.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await facilities.getCourt(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/courts',
  requireAuth,
  requirePermission('court.manage'),
  validate({ body: courtCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await facilities.createCourt(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/courts/:id',
  requireAuth,
  requirePermission('court.manage'),
  validate({ params: idParamsSchema, body: courtUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await facilities.updateCourt(req.params.id, req.body, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/court-blocks',
  requireAuth,
  requirePermission('court.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await courtBlockService.list(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/court-blocks',
  requireAuth,
  requirePermission('court_block.create'),
  validate({ body: courtBlockCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await courtBlockService.create(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/court-blocks/:id',
  requireAuth,
  requirePermission('court.manage'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await courtBlockService.remove(req.params.id, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
