import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { requireMcpAuth } from './mcpAuth.middleware.js';
import * as mcp from './mcp.service.js';
import {
  clubSummaryQuerySchema,
  revenueQuerySchema,
  bookingSummaryQuerySchema,
  availabilityQuerySchema,
  searchMembersQuerySchema,
  memberIdQuerySchema,
  expiringQuerySchema,
  prepareCancelBookingSchema,
  prepareCreateBookingSchema,
  confirmActionSchema,
  cancelActionSchema,
} from './mcp.schemas.js';

const router = Router();

const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?.prefix || req.ip,
  message: {
    isOk: false,
    status: 429,
    message: 'MCP rate limit exceeded (60/min)',
  },
});

function ok(res, data, message = 'ok', status = 200) {
  return res.status(status).json({ isOk: true, status, message, data });
}

router.use(mcpLimiter);

router.get('/health', (_req, res) => ok(res, { service: 'arambh-mcp-api', tz: 'Asia/Kolkata' }));

router.get(
  '/club-summary',
  requireMcpAuth('mcp.read'),
  validate({ query: clubSummaryQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getClubSummary(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/revenue',
  requireMcpAuth('mcp.read'),
  validate({ query: revenueQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getRevenue(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/booking-summary',
  requireMcpAuth('mcp.read'),
  validate({ query: bookingSummaryQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getBookingSummary(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/court-availability',
  requireMcpAuth('mcp.read'),
  validate({ query: availabilityQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getCourtAvailability(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/search',
  requireMcpAuth('mcp.read'),
  validate({ query: searchMembersQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.searchMembers(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/members/one',
  requireMcpAuth('mcp.read'),
  validate({ query: memberIdQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getMember(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/memberships/expiring',
  requireMcpAuth('mcp.read'),
  validate({ query: expiringQuerySchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getExpiringMemberships(req.query));
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/finance/snapshot',
  requireMcpAuth('mcp.read'),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.getFinancialSnapshot());
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/actions/prepare-cancel-booking',
  requireMcpAuth('mcp.write'),
  validate({ body: prepareCancelBookingSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.prepareCancelBooking(req.body, req.ctx), 'confirmation_required');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/actions/prepare-create-booking',
  requireMcpAuth('mcp.write'),
  validate({ body: prepareCreateBookingSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.prepareCreateBooking(req.body, req.ctx), 'confirmation_required');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/actions/confirm',
  requireMcpAuth('mcp.write'),
  validate({ body: confirmActionSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.confirmAction(req.body, req.ctx), 'confirmed');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/actions/cancel',
  requireMcpAuth('mcp.write'),
  validate({ body: cancelActionSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.cancelAction(req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
