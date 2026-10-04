import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requirePortalAuth } from '../portal/portal.routes.js';
import {
  cartAddSchema,
  cartItemParamsSchema,
  cartMergeSchema,
  cartUpdateSchema,
  checkoutQuoteSchema,
  checkoutSchema,
  orderCancelSchema,
  orderNumberParamsSchema,
} from './ecommerce.schemas.js';
import * as cartService from './cart.service.js';
import * as orderService from './order.service.js';

const router = Router();

function ok(res, data, message = 'ok', status = 200) {
  return res.status(status).json({ isOk: true, status, message, data });
}

// Cart, checkout and order history all belong to the signed-in shopper.
router.use(requirePortalAuth);

router.get('/cart', async (req, res, next) => {
  try {
    return ok(res, await cartService.getCart(req.portalAccountId));
  } catch (err) {
    return next(err);
  }
});

router.post('/cart/items', validate({ body: cartAddSchema }), async (req, res, next) => {
  try {
    const cart = await cartService.addItem(req.portalAccountId, req.body);
    return ok(res, cart, 'Added to cart', 201);
  } catch (err) {
    return next(err);
  }
});

router.patch(
  '/cart/items/:itemId',
  validate({ params: cartItemParamsSchema, body: cartUpdateSchema }),
  async (req, res, next) => {
    try {
      const cart = await cartService.updateItem(
        req.portalAccountId,
        req.params.itemId,
        req.body.quantity,
      );
      return ok(res, cart, 'Cart updated');
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/cart/items/:itemId',
  validate({ params: cartItemParamsSchema }),
  async (req, res, next) => {
    try {
      const cart = await cartService.removeItem(req.portalAccountId, req.params.itemId);
      return ok(res, cart, 'Product removed');
    } catch (err) {
      return next(err);
    }
  },
);

router.post('/cart/merge', validate({ body: cartMergeSchema }), async (req, res, next) => {
  try {
    return ok(res, await cartService.mergeGuestCart(req.portalAccountId, req.body.items));
  } catch (err) {
    return next(err);
  }
});

router.get(
  '/checkout/quote',
  validate({ query: checkoutQuoteSchema }),
  async (req, res, next) => {
    try {
      const quote = await orderService.quoteCheckout({
        accountId: req.portalAccountId,
        fulfillmentType: req.query.fulfillmentType || 'pickup',
      });
      return ok(res, quote);
    } catch (err) {
      return next(err);
    }
  },
);

router.post('/checkout', validate({ body: checkoutSchema }), async (req, res, next) => {
  try {
    const order = await orderService.checkout(
      { accountId: req.portalAccountId, ...req.body },
      { requestId: req.requestId, ip: req.ip, source: 'website' },
    );
    return ok(res, order, 'Order created successfully', 201);
  } catch (err) {
    return next(err);
  }
});

router.get('/my-orders', async (req, res, next) => {
  try {
    return ok(res, await orderService.listMyOrders(req.portalAccountId));
  } catch (err) {
    return next(err);
  }
});

router.get(
  '/my-orders/:orderNumber',
  validate({ params: orderNumberParamsSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await orderService.getMyOrder(req.portalAccountId, req.params.orderNumber));
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/my-orders/:orderNumber/cancel',
  validate({ params: orderNumberParamsSchema, body: orderCancelSchema }),
  async (req, res, next) => {
    try {
      const existing = await orderService.getMyOrder(
        req.portalAccountId,
        req.params.orderNumber,
      );
      const result = await orderService.cancel(
        existing.id,
        { reason: req.body.reason },
        { requestId: req.requestId, source: 'website' },
        { accountId: req.portalAccountId },
      );
      return ok(res, result, 'Order cancelled');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
