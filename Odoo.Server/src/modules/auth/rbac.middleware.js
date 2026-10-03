/**
 * String-permission RBAC for new Arambh routes.
 * Extends (does not replace) middlewares/checkPermission.js menu CRUD checks.
 * Auth remains express-session via middlewares/authMiddleware.js (ADR-0002).
 */
import { hasAnyPermission, hasAllPermissions } from './permissions.js';

/**
 * Any-of permission gate.
 * ADMIN role always bypasses. Reads session.user.stringPermissions.
 *
 * Usage: requirePermission('booking.create')
 *        requirePermission('booking.view', 'booking.create')
 *
 * @param {...string} perms
 */
export function requirePermission(...perms) {
  return (req, res, next) => {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({
          isOk: false,
          message: 'Not logged in',
          status: 401,
        });
      }

      if (sessionUser.role === 'ADMIN') {
        return next();
      }

      const have =
        sessionUser.stringPermissions ||
        (Array.isArray(sessionUser.permissions) &&
        typeof sessionUser.permissions[0] === 'string'
          ? sessionUser.permissions
          : []);

      if (hasAnyPermission(have, perms)) {
        return next();
      }

      return res.status(403).json({
        isOk: false,
        message: 'Access denied — missing permission',
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden',
          details: { requiredAnyOf: perms },
        },
        status: 403,
      });
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({
        isOk: false,
        message: 'Permission check failed',
        status: 500,
      });
    }
  };
}

/**
 * All-of permission gate (rare).
 * @param {...string} perms
 */
export function requireAllPermissions(...perms) {
  return (req, res, next) => {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({
          isOk: false,
          message: 'Not logged in',
          status: 401,
        });
      }

      if (sessionUser.role === 'ADMIN') {
        return next();
      }

      const have = sessionUser.stringPermissions || [];
      if (hasAllPermissions(have, perms)) {
        return next();
      }

      return res.status(403).json({
        isOk: false,
        message: 'Access denied — missing permission',
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden',
          details: { requiredAllOf: perms },
        },
        status: 403,
      });
    } catch (err) {
      console.error('requireAllPermissions error:', err);
      return res.status(500).json({
        isOk: false,
        message: 'Permission check failed',
        status: 500,
      });
    }
  };
}

export default { requirePermission, requireAllPermissions };
