/**
 * Authentication Middleware using Express Session
 * Uses in-memory session storage via express-session
 * ADR-0002: cookie session — do not replace with JWT for admin.
 */
import EmployeeRoles from "../models/EmployeeRoles.js";
import { attachStringPermissions } from "../src/modules/auth/sessionPermissions.js";

const refreshEmployeePermissions = async (sessionUser) => {
  if (sessionUser.role !== "EMPLOYEE" || !sessionUser.roleId) {
    return null;
  }

  try {
    const employeeRole = await EmployeeRoles.findOne({
      roleId: sessionUser.roleId,
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .select("roles updatedAt");

    if (!employeeRole) return null;

    const sessionUpdatedAt = sessionUser.permissionsUpdatedAt
      ? new Date(sessionUser.permissionsUpdatedAt).getTime()
      : 0;
    const dbUpdatedAt = new Date(employeeRole.updatedAt).getTime();

    if (dbUpdatedAt > sessionUpdatedAt) {
      return {
        // Menu CRUD flags — keep shape for checkPermission / MenuContext
        permissions: employeeRole.roles.map((r) => ({
          menuId: r.menuId?.toString(),
          menuGroupId: r.menuGroupId?.toString(),
          read: r.read,
          write: r.write,
          delete: r.delete,
          edit: r.edit,
          print: r.print,
          mail: r.mail,
        })),
        updatedAt: employeeRole.updatedAt,
      };
    }
  } catch (err) {
    console.error("Permission refresh error:", err.message);
  }
  return null;
};

export const authMiddleware = (roles) => {
  return async (req, res, next) => {
    // Check if user has an active session
    if (!req.session?.user) {
      // Clear the session cookie since it's invalid
      res.clearCookie("sessionId");
      return res.status(401).json({
        success: false,
        error: "Not logged in",
        status: 401,
        message: "Not logged in",
      });
    }

    const sessionUser = req.session.user;

    // Check if session has required data
    if (!sessionUser.id || !sessionUser.role) {
      // Clear the session cookie since it's invalid
      res.clearCookie("sessionId");
      return res.status(401).json({
        success: false,
        message: "Session invalid or expired",
        error: "Session invalid or expired",
        status: 401,
      });
    }

    // Check if user role is allowed
    if (roles && roles.length > 0 && !roles.includes(sessionUser.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "You do not have permission to access this resource",
        status: 403,
      });
    }

    // Attach user data to request (compatible with existing code)
    // ── AUTO-REFRESH MENU PERMISSIONS FOR EMPLOYEE ─────────────────
    const refreshData = await refreshEmployeePermissions(sessionUser);
    if (refreshData) {
      req.session.user.permissions = refreshData.permissions;
      req.session.user.permissionsUpdatedAt = refreshData.updatedAt;
    }
    // Rebuild string permissions when menu checkboxes change, and once
    // for sessions that were created before menu grants were included.
    const stamp = req.session.user.permissionsUpdatedAt
      ? new Date(req.session.user.permissionsUpdatedAt).toISOString()
      : "none";
    const missingStrings =
      !Array.isArray(req.session.user.stringPermissions) ||
      (req.session.user.role === "ADMIN" &&
        req.session.user.stringPermissions.length === 0);
    const menuGrantsStale =
      req.session.user.role !== "ADMIN" &&
      req.session.user.menuGrantSyncAt !== stamp;
    if (missingStrings || menuGrantsStale) {
      await attachStringPermissions(req.session.user);
    }
    // ───────────────────────────────────────────────────────────────
    req.user = {
      id: sessionUser.id,
      role: sessionUser.role,
      email: sessionUser.email,
      name: sessionUser.name,
      roleId: req.session.user.roleId || null,
      arambhRoleKey: req.session.user.arambhRoleKey || null,
      stringPermissions: req.session.user.stringPermissions || [],
    };

    // Service ctx for new Arambh modules (ADR-0002 session shape)
    req.ctx = {
      user: req.user,
      permissions: new Set(req.user.stringPermissions || []),
      requestId: req.requestId || req.id,
      ip: req.ip,
      source: "admin",
    };

    next();
  };
};
