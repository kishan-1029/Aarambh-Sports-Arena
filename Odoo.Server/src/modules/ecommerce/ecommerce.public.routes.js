import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { publicProductQuerySchema, slugParamsSchema } from './ecommerce.schemas.js';
import * as catalog from './catalog.service.js';
import * as portalService from '../portal/portal.service.js';

const router = Router();

function ok(res, data, message = 'ok', meta) {
  const body = { isOk: true, status: 200, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

/**
 * The shop is browsable by anyone. When a valid portal token happens to be
 * present we attach the account so member pricing shows on the cards —
 * an invalid or missing token just means guest pricing, never a 401.
 */
function optionalPortalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (token) {
    const payload = portalService.verifyToken(token);
    if (payload?.id) req.portalAccountId = payload.id;
  }
  return next();
}

router.get('/shop/categories', async (req, res, next) => {
  try {
    return ok(res, await catalog.listPublicCategories());
  } catch (err) {
    return next(err);
  }
});

router.get('/shop/brands', async (req, res, next) => {
  try {
    return ok(res, await catalog.listPublicBrands());
  } catch (err) {
    return next(err);
  }
});

router.get(
  '/shop/products',
  optionalPortalAuth,
  validate({ query: publicProductQuerySchema }),
  async (req, res, next) => {
    try {
      const { data, meta } = await catalog.listPublicProducts(req.query, req.portalAccountId);
      return ok(res, data, 'ok', meta);
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/shop/products/:slug',
  optionalPortalAuth,
  validate({ params: slugParamsSchema }),
  async (req, res, next) => {
    try {
      return ok(res, await catalog.getPublicProduct(req.params.slug, req.portalAccountId));
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
