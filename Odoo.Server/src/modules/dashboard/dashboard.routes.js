import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { requirePermission } from '../auth/rbac.middleware.js';
import * as dashboardService from './dashboard.service.js';

const router = Router();
const requireAuth = authMiddleware(['ADMIN', 'EMPLOYEE']);

router.get(
  '/dashboard',
  requireAuth,
  requirePermission('dashboard.view'),
  async (req, res, next) => {
    try {
      const data = await dashboardService.getDashboardSummary();
      return res.status(200).json({
        isOk: true,
        status: 200,
        message: 'ok',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
