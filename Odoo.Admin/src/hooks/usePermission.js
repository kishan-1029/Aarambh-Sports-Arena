import { useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { MenuContext } from '../context/MenuContext';
import { permissionsForMenuFlags } from '@shared/menuGrantPermissions.js';

/**
 * Hook for Arambh string permissions (booking.create, etc.).
 * Complements MenuContext menu CRUD flags — does not replace them.
 *
 * @param {string} [perm] optional single permission to check
 * @returns {{
 *   can: (p: string) => boolean,
 *   canAny: (...perms: string[]) => boolean,
 *   canAll: (...perms: string[]) => boolean,
 *   permissions: string[],
 *   arambhRoleKey: string|null,
 *   allowed: boolean,
 * }}
 */
export function usePermission(perm) {
  const { stringPermissions, arambhRoleKey, role } = useContext(AuthContext) || {};
  const menu = useContext(MenuContext) || {};

  const permissions = useMemo(
    () => (Array.isArray(stringPermissions) ? stringPermissions : []),
    [stringPermissions],
  );

  const grantPerms = useMemo(() => {
    const set = new Set();
    const access = menu.menuAccessByUrl || {};
    for (const [url, flags] of Object.entries(access)) {
      for (const granted of permissionsForMenuFlags(url, flags)) set.add(granted);
    }
    return set;
  }, [menu.menuAccessByUrl]);

  const isAdmin = role === 'ADMIN' || !!menu.isAdmin;
  const grantsLoading = !isAdmin && !!menu.loading;

  const can = useCallback(
    (p) => {
      if (!p) return true;
      if (isAdmin) return true;
      // Employees follow the checked menus only. The role-name template must
      // not unlock screens that were left unchecked.
      return grantPerms.has(p);
    },
    [isAdmin, grantPerms],
  );

  const canAny = useCallback(
    (...perms) => {
      if (!perms.length) return true;
      if (isAdmin) return true;
      return perms.some((p) => can(p));
    },
    [isAdmin, can],
  );

  const canAll = useCallback(
    (...perms) => {
      if (!perms.length) return true;
      if (isAdmin) return true;
      return perms.every((p) => can(p));
    },
    [isAdmin, can],
  );

  return {
    can,
    canAny,
    canAll,
    permissions,
    grantsLoading,
    arambhRoleKey: arambhRoleKey || null,
    allowed: perm ? can(perm) : true,
  };
}

export default usePermission;
