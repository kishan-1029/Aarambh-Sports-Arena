import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createApiKeySchema } from './mcp.schemas.js';
import * as mcp from './mcp.service.js';
import { z } from 'zod';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

function ok(res, data, message = 'ok') {
  return res.status(200).json({ isOk: true, status: 200, message, data });
}

router.get(
  '/mcp-keys',
  requireAuth,
  requirePermission('mcp.manage'),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.listApiKeys());
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/mcp-keys',
  requireAuth,
  requirePermission('mcp.manage'),
  validate({ body: createApiKeySchema }),
  async (req, res, next) => {
    try {
      const data = await mcp.createApiKey(req.body, req.user || req.session?.user);
      return res.status(201).json({
        isOk: true,
        status: 201,
        message: 'API key created — copy it now; it will not be shown again',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/mcp-keys/:id/revoke',
  requireAuth,
  requirePermission('mcp.manage'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      return ok(res, await mcp.revokeApiKey(req.params.id, req.user || req.session?.user), 'revoked');
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
