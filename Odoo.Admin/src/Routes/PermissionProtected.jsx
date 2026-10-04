import React, { useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { MenuContext } from "../context/MenuContext";
import {
    collectMenuUrls,
    employeeRouteAllowed,
} from "@shared/menuGrantPermissions.js";

/**
 * PermissionProtected — RBAC for routes.
 * ADMIN: full access.
 * EMPLOYEE: only MenuMaster URLs granted via EmployeeRoles (read),
 * plus a tiny always-open set (dashboard/profile).
 */

const EMPLOYEE_OPEN_ROUTES = ["/dashboard", "/profile", "/"];

const normalizeUrl = (url) => url.split("?")[0].replace(/\/+$/, "") || "/";

const pathMatches = (normalizedPath, route) => {
    const normalizedRoute = normalizeUrl(route);
    if (normalizedPath === normalizedRoute) return true;
    // Detail children of list menus
    if (
        normalizedRoute !== "/" &&
        normalizedPath.startsWith(`${normalizedRoute}/`)
    ) {
        return true;
    }
    return false;
};

const PermissionProtected = ({ children }) => {
    const { role } = useContext(AuthContext);
    const menuContext = useContext(MenuContext);
    const location = useLocation();

    const {
        isAdmin,
        loading: menuLoading,
        menuData,
        getPermissionsForMenu,
        findMenuIdByUrlInComplete,
    } = menuContext || {};

    const access = useMemo(() => {
        try {
            const normalizedPath = normalizeUrl(location.pathname);

            if (!menuContext) {
                return { status: "error", message: "MenuContext not available" };
            }

            if (!role) {
                return { status: "denied" };
            }

            // Company admins keep the full menu. Employees only open screens
            // that were checked for their role, plus the landing pages.
            if (role === "ADMIN" || isAdmin) {
                return { status: "allowed" };
            }

            const grantedUrls = collectMenuUrls(menuData);
            if (employeeRouteAllowed(normalizedPath, grantedUrls)) {
                return { status: "allowed" };
            }

            const isOpen = EMPLOYEE_OPEN_ROUTES.some((route) =>
                pathMatches(normalizedPath, route),
            );
            if (isOpen) {
                return { status: "allowed" };
            }

            if (!menuContext) {
                return { status: "error", message: "MenuContext not available" };
            }

            const hasLoadedMenus = Boolean(menuData && menuData.length > 0);
            if (menuLoading && !hasLoadedMenus) {
                return { status: "loading" };
            }

            if (typeof findMenuIdByUrlInComplete !== "function") {
                return { status: "denied" };
            }

            if (typeof getPermissionsForMenu !== "function") {
                return { status: "denied" };
            }

            // Prefer exact menu id; also accept parent list URL for detail pages
            let menuId = findMenuIdByUrlInComplete(location.pathname);
            if (!menuId && hasLoadedMenus) {
                const walk = (nodes) => {
                    for (const n of nodes || []) {
                        if (n?.url && pathMatches(normalizedPath, n.url)) {
                            return n.id || n.groupId || null;
                        }
                        const child = walk(n?.menus) || walk(n?.children);
                        if (child) return child;
                    }
                    return null;
                };
                menuId = walk(menuData);
            }

            if (!menuId) {
                return { status: "denied" };
            }

            const permissions = getPermissionsForMenu(menuId);
            const allowed = !!(
                permissions?.read ||
                permissions?.write ||
                permissions?.edit ||
                permissions?.delete ||
                permissions?.print ||
                permissions?.mail
            );

            return { status: allowed ? "allowed" : "denied" };
        } catch (err) {
            console.error("Error in PermissionProtected:", err);
            return { status: "error", message: err.message };
        }
    }, [
        role,
        location.pathname,
        menuContext,
        isAdmin,
        menuLoading,
        menuData,
        getPermissionsForMenu,
        findMenuIdByUrlInComplete,
    ]);

    if (access.status === "loading") {
        return null;
    }

    if (access.status === "denied") {
        return <Navigate to="/dashboard" replace />;
    }

    if (access.status === "error") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

PermissionProtected.propTypes = {
    children: PropTypes.node,
};

export { PermissionProtected };
export default PermissionProtected;
