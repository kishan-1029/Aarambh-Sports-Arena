/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { getCurrentUser } from "../api/auth.api";
import { getMenusByGroups } from "../api/menus.api";
import { getEmployeeRolesByRoleId } from "../api/employeeRoles.api";
import { AuthContext } from "./AuthContext";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { normalizeMenuUrl } from "@shared/menuGrantPermissions.js";

const MenuContext = createContext();

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

const idStr = (value) => {
    if (value == null || value === "") return null;
    if (typeof value === "object") {
        if (value._id != null) return String(value._id);
        if (value.id != null) return String(value.id);
    }
    return String(value);
};

const sameId = (a, b) => {
    const left = idStr(a);
    const right = idStr(b);
    return left != null && right != null && left === right;
};

const hasAnyGrant = (role) =>
    !!(role?.read || role?.write || role?.delete || role?.edit || role?.print || role?.mail);

const normalizeMenus = (menus) => (menus || []).map((menu) => ({
    ...menu,
    id: idStr(menu.id),
    children: menu.children ? normalizeMenus(menu.children) : menu.children,
}));

const normalizeMenuGroups = (groups) => (groups || []).map((group) => ({
    ...group,
    groupId: idStr(group.groupId),
    menus: normalizeMenus(group.menus),
}));

const normalizeRoleDoc = (doc) => {
    if (!doc) return null;
    return {
        ...doc,
        roles: (doc.roles || []).map((role) => ({
            ...role,
            menuId: idStr(role.menuId),
            menuGroupId: idStr(role.menuGroupId),
        })),
    };
};

// Copy the tree. Filtering must not mutate the full menu list kept for URL lookup.
const filterMenuItems = (menuItems, roles) => {
    if (!Array.isArray(menuItems) || !Array.isArray(roles)) {
        return [];
    }

    return menuItems.reduce((acc, menu) => {
        const match = roles.find((role) => sameId(role.menuId, menu.id));
        const granted = hasAnyGrant(match);
        const children = menu.children?.length ? filterMenuItems(menu.children, roles) : [];

        if (granted || children.length > 0) {
            acc.push({
                ...menu,
                ...(menu.children ? { children } : {}),
            });
        }
        return acc;
    }, []);
};

const filterMenusByPermission = (menuGroups, roles) => {
    if (!Array.isArray(menuGroups) || !Array.isArray(roles)) {
        return [];
    }

    return menuGroups.reduce((acc, group) => {
        if (group.isLink) {
            const match = roles.find((role) => sameId(role.menuGroupId, group.groupId));
            if (hasAnyGrant(match)) acc.push({ ...group, menus: [] });
            return acc;
        }

        const groupGrant = roles.find((role) => sameId(role.menuGroupId, group.groupId));
        if (hasAnyGrant(groupGrant)) {
            acc.push({ ...group, menus: group.menus || [] });
            return acc;
        }

        const filteredMenus = filterMenuItems(group.menus || [], roles);
        if (filteredMenus.length > 0) {
            acc.push({ ...group, menus: filteredMenus });
        }
        return acc;
    }, []);
};

const permissionsFromRole = (menuId, role) => ({
    menuId,
    read: !!role?.read,
    write: !!role?.write,
    delete: !!role?.delete,
    edit: !!role?.edit,
    print: !!role?.print,
    mail: !!role?.mail,
});

const MenuProvider = ({ children }) => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [employeeRoles, setEmployeeRoles] = useState(null);
    const [currentPagePermissions, setCurrentPagePermissions] = useState({
        menuId: null,
        read: false,
        write: false,
        delete: false,
        edit: false,
        print: false,
        mail: false
    });

    const [menuCache, setMenuCache] = useState({
        adminMenus: null,
        roleMenus: {},
        completeMenus: null,
        timestamp: null
    });

    const { role: authRole, isSessionVerified, menuPermissions, sessionRoleId } = useContext(AuthContext);
    const lastRoleIdRef = useRef(null);
    const isAdminRef = useRef(false);
    const employeeRolesRef = useRef(null);
    const fetchSeq = useRef(0);
    const menuCacheRef = useRef(menuCache);
    menuCacheRef.current = menuCache;

    const grantsFromAuth = useCallback(() => {
        if (Array.isArray(menuPermissions) && menuPermissions.length) {
            return normalizeRoleDoc({ roles: menuPermissions });
        }
        return null;
    }, [menuPermissions]);

    const checkUserRole = useCallback(async () => {
        const fallback = () => ({
            isAdmin: isAdminRef.current || authRole === "ADMIN",
            roleId: lastRoleIdRef.current || sessionRoleId || null,
            grants: grantsFromAuth(),
        });

        try {
            if (!authRole) {
                return { isAdmin: false, roleId: null, grants: null };
            }

            const response = await getCurrentUser();
            const userData = response.data?.data;
            if (!response.data?.isOk || !userData) {
                return fallback();
            }

            const admin = userData.role === "ADMIN" || authRole === "ADMIN";
            const roleId = idStr(userData.roleId) || sessionRoleId || lastRoleIdRef.current;
            const grants = Array.isArray(userData.permissions)
                ? normalizeRoleDoc({ roles: userData.permissions })
                : grantsFromAuth();
            setIsAdmin(admin);
            isAdminRef.current = admin;
            if (roleId) lastRoleIdRef.current = roleId;
            return { isAdmin: admin, roleId, grants };
        } catch (err) {
            console.error("Error checking user role:", err);
            return fallback();
        }
    }, [authRole, sessionRoleId, grantsFromAuth]);

    const fetchEmployeeRoles = useCallback(async (roleId) => {
        try {
            if (!roleId) {
                employeeRolesRef.current = null;
                setEmployeeRoles(null);
                return null;
            }

            const response = await getEmployeeRolesByRoleId(roleId);
            if (!response.data?.isOk) return null;
            const row = Array.isArray(response.data?.data) ? response.data.data[0] : null;
            const normalized = row ? normalizeRoleDoc(row) : { roles: [] };
            employeeRolesRef.current = normalized;
            setEmployeeRoles(normalized);
            return normalized;
        } catch (err) {
            console.error("Error fetching employee roles:", err);
            return null;
        }
    }, []);

    const invalidateMenuCache = useCallback(() => {
        menuCacheRef.current = {
            adminMenus: null,
            roleMenus: {},
            completeMenus: null,
            timestamp: null
        };
        setMenuCache({
            adminMenus: null,
            roleMenus: {},
            completeMenus: null,
            timestamp: null
        });
    }, []);

    const getCachedMenuData = useCallback((adminStatus, roleId) => {
        const cache = menuCacheRef.current;
        if (!cache.timestamp || (Date.now() - cache.timestamp) >= CACHE_DURATION) return null;
        if (adminStatus && cache.adminMenus) return cache.adminMenus;
        if (!adminStatus && roleId && cache.roleMenus[roleId]) return cache.roleMenus[roleId];
        return null;
    }, []);

    const processFetchedMenus = useCallback(async (menuGroups, adminStatus, roleId, now, grants) => {
        const completeMenus = normalizeMenuGroups(menuGroups);

        if (adminStatus) {
            setMenuData(completeMenus);
            setMenuCache(prev => ({
                ...prev,
                adminMenus: completeMenus,
                completeMenus,
                timestamp: now
            }));
            return;
        }

        let roleDoc = grants || grantsFromAuth();
        if (!roleDoc && roleId) {
            roleDoc = await fetchEmployeeRoles(roleId);
        }
        if (roleDoc?.roles) {
            employeeRolesRef.current = roleDoc;
            setEmployeeRoles(roleDoc);
        }

        if (!roleDoc) {
            setMenuData([]);
            return;
        }

        const filteredMenuGroups = filterMenusByPermission(completeMenus, roleDoc.roles || []);
        setMenuData(filteredMenuGroups);
        if (roleId) lastRoleIdRef.current = roleId;
        setMenuCache(prev => ({
            ...prev,
            roleMenus: {
                ...prev.roleMenus,
                ...(roleId ? { [roleId]: filteredMenuGroups } : {}),
            },
            completeMenus,
            timestamp: now
        }));
    }, [fetchEmployeeRoles, grantsFromAuth]);

    const roleForMenu = (menuId) => {
        const roles = employeeRolesRef.current?.roles;
        if (!roles || !menuId) return null;
        return roles.find((role) => sameId(role.menuId, menuId) || sameId(role.menuGroupId, menuId)) || null;
    };

    const updateCurrentPagePermissions = useCallback((menuId) => {
        if (isAdminRef.current) {
            setCurrentPagePermissions({
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            });
            return;
        }

        setCurrentPagePermissions(permissionsFromRole(menuId, roleForMenu(menuId)));
    }, []);

    const getPermissionsForMenu = useCallback((menuId) => {
        if (isAdminRef.current || isAdmin) {
            return {
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            };
        }

        return permissionsFromRole(menuId, roleForMenu(menuId));
    }, [isAdmin, employeeRoles]);

    const findMenuIdByUrl = useCallback((url) => {
        if (!url || !Array.isArray(menuData)) {
            return null;
        }

        const cleanUrl = url.split('?')[0].replace(/\/+$/, '') || '/';
        let foundMenuId = null;

        const directLinkGroup = menuData.find(group => {
            if (!group.isLink || !group.url) return false;
            const groupUrl = group.url.replace(/\/+$/, '') || '/';
            return groupUrl === cleanUrl;
        });

        if (directLinkGroup) {
            return directLinkGroup.groupId;
        }

        const searchMenus = (menus) => {
            if (!Array.isArray(menus) || foundMenuId) return;

            for (const menu of menus) {
                if (menu.url) {
                    const menuUrl = menu.url.replace(/\/+$/, '') || '/';
                    if (menuUrl === cleanUrl) {
                        foundMenuId = menu.id;
                        return;
                    }
                }

                if (menu.children && menu.children.length > 0) {
                    searchMenus(menu.children);
                }
            }
        };

        for (const group of menuData) {
            if (group.menus && group.menus.length > 0) {
                searchMenus(group.menus);
                if (foundMenuId) break;
            }
        }

        return foundMenuId;
    }, [menuData]);

    const findMenuIdByUrlInComplete = useCallback((url) => {
        try {
            if (!url || !menuCache.completeMenus || !Array.isArray(menuCache.completeMenus)) {
                return null;
            }

            const cleanUrl = url.split('?')[0].replace(/\/+$/, '') || '/';
            let foundMenuId = null;

            const directLinkGroup = menuCache.completeMenus.find(group => {
                if (!group.isLink || !group.url) return false;
                const groupUrl = group.url.replace(/\/+$/, '') || '/';
                return groupUrl === cleanUrl;
            });

            if (directLinkGroup) {
                return directLinkGroup.groupId;
            }

            const searchMenus = (menus) => {
                if (!Array.isArray(menus) || foundMenuId) return;

                for (const menu of menus) {
                    if (menu?.url) {
                        const menuUrl = menu.url.replace(/\/+$/, '') || '/';
                        if (menuUrl === cleanUrl) {
                            foundMenuId = menu.id;
                            return;
                        }
                    }

                    if (menu?.children?.length > 0) {
                        searchMenus(menu.children);
                    }
                }
            };

            for (const group of menuCache.completeMenus) {
                if (group?.menus?.length > 0) {
                    searchMenus(group.menus);
                    if (foundMenuId) break;
                }
            }

            return foundMenuId;
        } catch (err) {
            console.error("Error in findMenuIdByUrlInComplete:", err);
            return null;
        }
    }, [menuCache.completeMenus]);

    const menuAccessByUrl = useMemo(() => {
        const access = {};
        const urlById = new Map();
        const walk = (menus) => {
            for (const menu of menus || []) {
                if (menu?.id && menu?.url) urlById.set(String(menu.id), menu.url);
                if (menu?.children?.length) walk(menu.children);
            }
        };
        for (const group of menuCache.completeMenus || []) {
            if (group?.groupId && group?.url) urlById.set(String(group.groupId), group.url);
            walk(group?.menus);
        }
        for (const role of employeeRoles?.roles || []) {
            const url =
                urlById.get(String(role.menuId || "")) ||
                urlById.get(String(role.menuGroupId || ""));
            const key = normalizeMenuUrl(url);
            if (!key || !hasAnyGrant(role)) continue;
            const prev = access[key] || {};
            access[key] = {
                read: !!(prev.read || role.read),
                write: !!(prev.write || role.write),
                edit: !!(prev.edit || role.edit),
                delete: !!(prev.delete || role.delete),
                print: !!(prev.print || role.print),
                mail: !!(prev.mail || role.mail),
            };
        }
        return access;
    }, [menuCache.completeMenus, employeeRoles]);

    const updatePermissionsByCurrentUrl = useCallback(() => {
        const currentPath = globalThis.location.pathname;
        const menuId = findMenuIdByUrlInComplete(currentPath);
        if (menuId) {
            updateCurrentPagePermissions(menuId);
        }
    }, [findMenuIdByUrlInComplete, updateCurrentPagePermissions]);

    const fetchMenus = useCallback(async (forceRefresh = false) => {
        const seq = ++fetchSeq.current;
        const stillCurrent = () => seq === fetchSeq.current;

        try {
            if (!authRole) {
                setError("No authentication found");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            const { isAdmin: adminStatus, roleId, grants } = await checkUserRole();
            if (!stillCurrent()) return;

            if (!forceRefresh) {
                const cachedData = getCachedMenuData(adminStatus, roleId);
                if (cachedData) {
                    setMenuData(cachedData);
                    if (!adminStatus && (grants || roleId)) {
                        if (grants) {
                            employeeRolesRef.current = grants;
                            setEmployeeRoles(grants);
                        } else {
                            await fetchEmployeeRoles(roleId);
                        }
                    }
                    if (!stillCurrent()) return;
                    updatePermissionsByCurrentUrl();
                    setLoading(false);
                    return;
                }
            }

            const response = await getMenusByGroups();
            if (!stillCurrent()) return;

            if (response.data?.isOk && Array.isArray(response.data.data)) {
                await processFetchedMenus(response.data.data, adminStatus, roleId, Date.now(), grants);
                if (!stillCurrent()) return;
                updatePermissionsByCurrentUrl();
            } else {
                setError(apiErrorMessage(response, "Failed to get menu data"));
            }
        } catch (err) {
            if (!stillCurrent()) return;
            console.error("Error fetching menus:", err);
            setError(apiErrorMessage(err, "Failed to fetch menus"));
        } finally {
            if (stillCurrent()) setLoading(false);
        }
    }, [authRole, checkUserRole, getCachedMenuData, fetchEmployeeRoles, processFetchedMenus, updatePermissionsByCurrentUrl]);

    const fetchMenusRef = useRef(fetchMenus);
    fetchMenusRef.current = fetchMenus;

    // Load once per verified session. Do not re-run when fetchMenus identity changes,
    // or an in-flight call that started before the role id existed can wipe the sidebar.
    useEffect(() => {
        if (isSessionVerified && authRole) {
            fetchMenusRef.current(true);
        }
    }, [isSessionVerified, authRole]);

    useEffect(() => {
        if (!loading && menuData.length > 0) {
            updatePermissionsByCurrentUrl();
        }
    }, [loading, menuData, updatePermissionsByCurrentUrl]);

    const contextValue = useMemo(() => ({
        menuData,
        loading,
        error,
        fetchMenus,
        isAdmin,
        employeeRoles,
        menuAccessByUrl,
        invalidateMenuCache,
        currentPagePermissions,
        updateCurrentPagePermissions,
        getPermissionsForMenu,
        findMenuIdByUrl,
        findMenuIdByUrlInComplete,
        updatePermissionsByCurrentUrl
    }), [
        menuData,
        loading,
        error,
        fetchMenus,
        isAdmin,
        employeeRoles,
        menuAccessByUrl,
        invalidateMenuCache,
        currentPagePermissions,
        updateCurrentPagePermissions,
        getPermissionsForMenu,
        findMenuIdByUrl,
        findMenuIdByUrlInComplete,
        updatePermissionsByCurrentUrl
    ]);

    return (
        <MenuContext.Provider value={contextValue}>
            {children}
        </MenuContext.Provider>
    );
};

MenuProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export { MenuContext, MenuProvider };