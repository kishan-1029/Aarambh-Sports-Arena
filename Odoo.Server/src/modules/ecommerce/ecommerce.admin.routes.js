import { Router } from 'express';
import path from 'node:path';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createSecureImageUpload } from '../../../middlewares/secureUpload.js';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  idParamsSchema,
  movementQuerySchema,
  orderCancelSchema,
  orderNoteSchema,
  orderPaymentSchema,
  orderStatusSchema,
  productArchiveSchema,
  productCreateSchema,
  productUpdateSchema,
  stockAdjustSchema,
  stockInSchema,
} from './ecommerce.schemas.js';
import * as catalog from './catalog.service.js';
import * as inventory from './inventory.service.js';
import * as orders from './order.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

function created(res, data) {
  return res.status(201).json({ isOk: true, status: 201, message: 'created', data });
}

// ──────────────────────────── Dashboard ────────────────────────────

router.get(
  '/ecommerce/dashboard',
  requireAuth,
  requirePermission('product.view', 'order.view', 'inventory.view'),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.dashboard());
    } catch (err) {
      return next(err);
    }
  },
);

// ──────────────────────────── Categories ────────────────────────────

router.get(
  '/product-categories',
  requireAuth,
  requirePermission('product.view', 'inventory.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await catalog.listCategories(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/product-categories',
  requireAuth,
  requirePermission('product.edit'),
  validate({ body: categoryCreateSchema }),
  async (req, res, next) => {
    try {
      return created(res, await catalog.createCategory(req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/product-categories/:id',
  requireAuth,
  requirePermission('product.edit'),
  validate({ params: idParamsSchema, body: categoryUpdateSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.updateCategory(req.params.id, req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/product-categories/:id',
  requireAuth,
  requirePermission('product.edit'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.deleteCategory(req.params.id, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

// ──────────────────────────── Products ────────────────────────────

router.get(
  '/products',
  requireAuth,
  requirePermission('product.view', 'inventory.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await catalog.listProducts(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/products/:id',
  requireAuth,
  requirePermission('product.view', 'inventory.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.getProduct(req.params.id));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/products',
  requireAuth,
  requirePermission('product.edit'),
  validate({ body: productCreateSchema }),
  async (req, res, next) => {
    try {
      return created(res, await catalog.createProduct(req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/products/:id',
  requireAuth,
  requirePermission('product.edit'),
  validate({ params: idParamsSchema, body: productUpdateSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.updateProduct(req.params.id, req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/products/:id/archive',
  requireAuth,
  requirePermission('product.edit'),
  validate({ params: idParamsSchema, body: productArchiveSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.setProductArchived(req.params.id, req.body.archived, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

/** Product images — same secure upload pipeline the rest of the admin uses. */
router.post(
  '/products/upload-image',
  requireAuth,
  requirePermission('product.edit'),
  createSecureImageUpload({
    destination: path.join('uploads', 'products'),
    fieldName: 'image',
    quality: 82,
  }),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ isOk: false, status: 400, message: 'Choose an image to upload' });
      }
      const url = `uploads/products/${req.file.filename}`;
      return created(res, { url, size: req.file.size });
    } catch (err) {
      return next(err);
    }
  },
);

// ──────────────────────────── Inventory ────────────────────────────

router.get(
  '/inventory',
  requireAuth,
  requirePermission('inventory.view', 'product.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await inventory.listStock(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/inventory/low-stock',
  requireAuth,
  requirePermission('inventory.view', 'product.view'),
  async (req, res, next) => {
    try {
      return ok(res, await inventory.lowStockRows());
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/inventory/movements',
  requireAuth,
  requirePermission('inventory.view', 'product.view'),
  validate({ query: movementQuerySchema }),
  async (req, res, next) => {
    try {
      const { data, meta } = await inventory.listMovements(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/inventory/stock-in',
  requireAuth,
  requirePermission('inventory.create'),
  validate({ body: stockInSchema }),
  async (req, res, next) => {
    try {
      return created(res, await inventory.stockIn(req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/inventory/adjust',
  requireAuth,
  requirePermission('inventory.create', 'inventory.approve'),
  validate({ body: stockAdjustSchema }),
  async (req, res, next) => {
    try {
      return created(res, await inventory.adjust(req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

// ──────────────────────────── Orders ────────────────────────────

router.get(
  '/shop-orders',
  requireAuth,
  requirePermission('order.view'),
  async (req, res, next) => {
    try {
      const { data, meta } = await orders.listOrders(req);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/shop-orders/:id',
  requireAuth,
  requirePermission('order.view'),
  validate({ params: idParamsSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orders.getOrder(req.params.id));
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/shop-orders/:id/status',
  requireAuth,
  requirePermission('order.edit'),
  validate({ params: idParamsSchema, body: orderStatusSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orders.updateStatus(req.params.id, req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/shop-orders/:id/payment',
  requireAuth,
  requirePermission('payment.manage', 'order.edit'),
  validate({ params: idParamsSchema, body: orderPaymentSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orders.recordPayment(req.params.id, req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/shop-orders/:id/cancel',
  requireAuth,
  requirePermission('order.cancel'),
  validate({ params: idParamsSchema, body: orderCancelSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orders.cancel(req.params.id, req.body, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/shop-orders/:id/note',
  requireAuth,
  requirePermission('order.edit'),
  validate({ params: idParamsSchema, body: orderNoteSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orders.setAdminNote(req.params.id, req.body.note, req.ctx));
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
