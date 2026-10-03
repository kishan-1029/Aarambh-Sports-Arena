import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  locationCreateSchema,
  locationUpdateSchema,
  settingsPatchSchema,
  taxCreateSchema,
  taxUpdateSchema,
  idParamsSchema,
} from './settings.schemas.js';
import * as settingsService from './settings.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/settings',
  requireAuth,
  requirePermission('settings.manage'),
  async (req, res, next) => {
    try {
      const data = await settingsService.getClubSettings(req.query.locationId || null);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/settings',
  requireAuth,
  requirePermission('settings.manage'),
  validate({ body: settingsPatchSchema }),
  async (req, res, next) => {
    try {
      const data = await settingsService.patchSettings(req.body, req.ctx);
      return ok(res, data, 'Settings updated');
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/locations',
  requireAuth,
  requirePermission('settings.manage'),
  async (req, res, next) => {
    try {
      const { data, meta } = await settingsService.listLocations(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/locations',
  requireAuth,
  requirePermission('settings.manage'),
  validate({ body: locationCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await settingsService.createLocation(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Location created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/locations/:id',
  requireAuth,
  requirePermission('settings.manage'),
  validate({ params: idParamsSchema, body: locationUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await settingsService.updateLocation(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Location updated');
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/taxes',
  requireAuth,
  requirePermission('settings.manage', 'invoice.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await settingsService.listTaxes(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/taxes',
  requireAuth,
  requirePermission('settings.manage'),
  validate({ body: taxCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await settingsService.createTax(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'Tax created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/taxes/:id',
  requireAuth,
  requirePermission('settings.manage'),
  validate({ params: idParamsSchema, body: taxUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = await settingsService.updateTax(req.params.id, req.body, req.ctx);
      return ok(res, data, 'Tax updated');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
