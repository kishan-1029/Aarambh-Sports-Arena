import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import {
  availabilityQuerySchema,
  enquiryBodySchema,
  trialBodySchema,
} from './public.schemas.js';
import * as publicService from './public.service.js';

const router = Router();

function ok(res, data, message = 'ok', status = 200) {
  return res.status(status).json({ isOk: true, status, message, data });
}

function ctxFrom(req) {
  return {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    source: 'website',
  };
}

/** Stricter limit for public form POSTs (relaxed for local demo) */
const formRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 50_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    isOk: false,
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many form submissions. Please try again later.',
  },
});

router.get('/club', async (req, res, next) => {
  try {
    const data = await publicService.getClub();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

router.get('/sports', async (req, res, next) => {
  try {
    const data = await publicService.listSportsPublic();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

router.get('/membership-plans', async (req, res, next) => {
  try {
    const data = await publicService.listMembershipPlansPublic();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

router.get('/faqs', async (req, res, next) => {
  try {
    const data = await publicService.listFaqsPublic();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

router.get('/blogs', async (req, res, next) => {
  try {
    const data = await publicService.listBlogsPublic({
      limit: req.query.limit,
    });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

router.get(
  '/availability',
  validate({ query: availabilityQuerySchema }),
  async (req, res, next) => {
    try {
      const data = await publicService.getPublicAvailability({
        localDate: req.query.localDate,
        sportId: req.query.sportId,
        days: req.query.days,
      });
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/enquiries',
  formRateLimiter,
  validate({ body: enquiryBodySchema }),
  async (req, res, next) => {
    try {
      const data = await publicService.createEnquiry(req.body, ctxFrom(req));
      return ok(res, data, 'created', 201);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/trials',
  formRateLimiter,
  validate({ body: trialBodySchema }),
  async (req, res, next) => {
    try {
      const data = await publicService.createTrial(req.body, ctxFrom(req));
      return ok(res, data, 'created', 201);
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
