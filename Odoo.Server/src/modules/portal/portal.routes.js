import { Router } from 'express';
import * as portalService from './portal.service.js';

export const publicAuthRouter = Router();
export const portalRouter = Router();

function ok(res, data, message = 'ok', status = 200) {
  return res.status(status).json({ isOk: true, status, message, data });
}

export function requirePortalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ isOk: false, status: 401, message: 'Authentication required' });
  }

  const payload = portalService.verifyToken(token);
  if (!payload || !payload.id) {
    return res.status(401).json({ isOk: false, status: 401, message: 'Invalid or expired token' });
  }

  req.portalAccountId = payload.id;
  next();
}

// ============ PUBLIC AUTH ROUTES (/api/public/auth) ============
publicAuthRouter.post('/register', async (req, res, next) => {
  try {
    const result = await portalService.register(req.body);
    return ok(res, result, 'Registered successfully', 201);
  } catch (err) {
    next(err);
  }
});

publicAuthRouter.post('/login', async (req, res, next) => {
  try {
    const result = await portalService.login(req.body);
    return ok(res, result, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
});

publicAuthRouter.get('/me', requirePortalAuth, async (req, res, next) => {
  try {
    const user = await portalService.getMe(req.portalAccountId);
    return ok(res, user);
  } catch (err) {
    next(err);
  }
});

// ============ PORTAL ROUTES (/api/portal) ============
portalRouter.use(requirePortalAuth);

portalRouter.post('/quote-slot', async (req, res, next) => {
  try {
    const { courtId, startUtc } = req.body;
    const quote = await portalService.quoteSlot({
      accountId: req.portalAccountId,
      courtId,
      startUtc,
    });
    return ok(res, quote);
  } catch (err) {
    next(err);
  }
});

portalRouter.post('/book-slot', async (req, res, next) => {
  try {
    const { courtId, startUtc, paymentMethod } = req.body;
    const booking = await portalService.bookSlot({
      accountId: req.portalAccountId,
      courtId,
      startUtc,
      paymentMethod,
    });
    return ok(res, booking, 'Slot booked successfully', 201);
  } catch (err) {
    next(err);
  }
});

portalRouter.get('/my-bookings', async (req, res, next) => {
  try {
    const bookings = await portalService.listMyBookings(req.portalAccountId);
    return ok(res, bookings);
  } catch (err) {
    next(err);
  }
});

portalRouter.post('/my-bookings/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await portalService.cancelBooking({
      accountId: req.portalAccountId,
      bookingId: req.params.id,
      reason,
    });
    return ok(res, result, 'Booking cancelled successfully');
  } catch (err) {
    next(err);
  }
});

portalRouter.post('/buy-membership', async (req, res, next) => {
  try {
    const { planId, durationMonths, paymentMethod } = req.body;
    const membership = await portalService.buyMembership({
      accountId: req.portalAccountId,
      planId,
      durationMonths,
      paymentMethod,
    });
    return ok(res, membership, 'Membership purchased successfully', 201);
  } catch (err) {
    next(err);
  }
});
