import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { createSecureImageUpload } from '../../../middlewares/secureUpload.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import * as pos from './pos.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

const posImageUpload = createSecureImageUpload({
  destination: 'uploads/pos',
  fieldName: 'image',
  maxSize: 2 * 1024 * 1024,
  compress: true,
  quality: 85,
});

function ok(res, data, message = 'ok') {
  return res.status(200).json({ isOk: true, status: 200, message, data });
}

router.get(
  '/pos/cafes',
  requireAuth,
  requirePermission('product.view'),
  async (req, res, next) => {
    try {
      const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
      return ok(res, await pos.listCafes({ activeOnly }));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/pos/cafes',
  requireAuth,
  requirePermission('product.edit'),
  validate({
    body: z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(120),
      code: z.string().min(2).max(20),
      description: z.string().max(500).optional(),
      contactNumber: z.string().max(30).optional(),
      isAcceptingOrders: z.boolean().optional(),
      isActive: z.boolean().optional(),
      sequence: z.number().int().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      return ok(res, await pos.upsertCafe(req.body), 'saved');
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/pos/categories',
  requireAuth,
  requirePermission('product.view'),
  async (req, res, next) => {
    try {
      return ok(res, await pos.listCategories());
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/pos/products',
  requireAuth,
  requirePermission('product.view'),
  async (req, res, next) => {
    try {
      return ok(res, await pos.listProductsAdmin());
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/pos/products',
  requireAuth,
  requirePermission('product.edit'),
  validate({
    body: z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(120),
      sku: z.string().max(40).optional(),
      categoryId: z.string().min(1),
      pricePaise: z.number().int().min(0),
      imageUrl: z.string().max(500).optional(),
      description: z.string().max(500).optional(),
      station: z.enum(['bar', 'kitchen', 'counter']).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      return ok(res, await pos.upsertProduct(req.body), 'saved');
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/pos/products/image',
  requireAuth,
  requirePermission('product.edit'),
  posImageUpload,
  async (req, res, next) => {
    try {
      if (!req.file?.filename) {
        return res.status(400).json({
          isOk: false,
          status: 400,
          message: 'Image file required',
        });
      }
      const imageUrl = `/uploads/pos/${req.file.filename}`;
      return ok(res, { imageUrl }, 'uploaded');
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/pos/cafes/:cafeId/menu',
  requireAuth,
  requirePermission('pos.create', 'product.view'),
  async (req, res, next) => {
    try {
      const admin = req.query.admin === '1' || req.query.admin === 'true';
      const data = admin
        ? await pos.getCafeMenuAdmin(req.params.cafeId)
        : await pos.getCafeMenuPos(req.params.cafeId);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

router.put(
  '/pos/cafes/:cafeId/menu/:productId',
  requireAuth,
  requirePermission('product.edit'),
  validate({
    body: z.object({
      onMenu: z.boolean().optional(),
      isSoldOut: z.boolean().optional(),
      customPricePaise: z.number().int().min(0).nullable().optional(),
      displayOrder: z.number().int().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      return ok(
        res,
        await pos.upsertCafeMenuItem(req.params.cafeId, req.params.productId, req.body),
        'updated',
      );
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/pos/orders/today',
  requireAuth,
  requirePermission('pos.create'),
  async (req, res, next) => {
    try {
      return ok(res, await pos.listTodaysOrders(req.query.cafeId));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/pos/orders/pay',
  requireAuth,
  requirePermission('pos.create'),
  validate({
    body: z.object({
      cafeId: z.string().min(1),
      clientOrderId: z.string().min(8).max(80),
      paymentMethod: z.enum(['cash', 'card', 'upi', 'other']).default('cash'),
      orderType: z.enum(['dine-in', 'takeaway', 'counter']).default('counter'),
      note: z.string().max(500).optional(),
      guestLabel: z.string().max(120).optional(),
      lines: z
        .array(
          z.object({
            productId: z.string().min(1),
            qty: z.number().int().min(1).max(99),
          }),
        )
        .min(1)
        .max(50),
    }),
  }),
  async (req, res, next) => {
    try {
      const data = await pos.createPaidOrder(req.body, {
        user: req.user || req.session?.user,
        requestId: req.requestId || req.id,
      });
      return ok(res, data, 'paid');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
