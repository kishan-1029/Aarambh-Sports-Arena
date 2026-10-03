import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  idParamsSchema,
  bookingCreateSchema,
  cancelSchema,
  rescheduleSchema,
  availabilityQuerySchema,
  calendarQuerySchema,
  socialSessionCreateSchema,
  socialJoinSchema,
} from './booking.schemas.js';
import * as bookingService from './booking.service.js';
import * as availabilityService from './availability.service.js';
import * as socialService from './socialSession.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

router.get(
  '/availability',
  requireAuth,
  requirePermission('booking.view'),
  validate({ query: availabilityQuerySchema }),
  async (req, res, next) => {
    try {
      const courtIds = req.query.courtIds
        ? String(req.query.courtIds).split(',').filter(Boolean)
        : undefined;
      const data = await availabilityService.getAvailability({
        localDate: req.query.localDate,
        sportId: req.query.sportId,
        courtIds,
        forMember: req.query.forMember,
      });
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/bookings/calendar',
  requireAuth,
  requirePermission('booking.view'),
  validate({ query: calendarQuerySchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.calendar({
        localDate: req.query.date,
        sportId: req.query.sportId,
      });
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/bookings',
  requireAuth,
  requirePermission('booking.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await bookingService.list(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/bookings/:id',
  requireAuth,
  requirePermission('booking.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.getById(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings',
  requireAuth,
  requirePermission('booking.create'),
  idempotency({ required: false, scope: 'admin:bookings' }),
  validate({ body: bookingCreateSchema }),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        idempotencyKey:
          req.body.idempotencyKey || req.headers['idempotency-key'] || undefined,
      };
      const data = await bookingService.create(body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings/:id/cancel',
  requireAuth,
  requirePermission('booking.cancel'),
  validate({ params: idParamsSchema, body: cancelSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.cancel(req.params.id, req.body, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings/:id/reschedule',
  requireAuth,
  requirePermission('booking.edit'),
  validate({ params: idParamsSchema, body: rescheduleSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.reschedule(req.params.id, req.body, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings/:id/check-in',
  requireAuth,
  requirePermission('booking.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.checkIn(req.params.id, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings/:id/no-show',
  requireAuth,
  requirePermission('booking.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.markNoShow(req.params.id, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/bookings/:id/confirm-payment',
  requireAuth,
  requirePermission('booking.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await bookingService.confirmPayment(req.params.id, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/social-sessions',
  requireAuth,
  requirePermission('social_session.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await socialService.list(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/social-sessions/:id',
  requireAuth,
  requirePermission('social_session.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await socialService.getById(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/social-sessions',
  requireAuth,
  requirePermission('social_session.create'),
  validate({ body: socialSessionCreateSchema }),
  async (req, res, next) => {
    try {
      const data = await socialService.create(req.body, req.ctx);
      return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/social-sessions/:id/join',
  requireAuth,
  requirePermission('social_session.edit'),
  validate({ params: idParamsSchema, body: socialJoinSchema }),
  async (req, res, next) => {
    try {
      const data = await socialService.join(req.params.id, req.body, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/social-sessions/:id/cancel',
  requireAuth,
  requirePermission('social_session.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await socialService.cancel(req.params.id, req.ctx);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
