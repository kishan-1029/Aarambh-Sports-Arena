import { useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

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

  const permissions = useMemo(
    () => (Array.isArray(stringPermissions) ? stringPermissions : []),
    [stringPermissions],
  );

  const isAdmin = role === 'ADMIN';

  const can = useCallback(
    (p) => {
      if (!p) return true;
      if (isAdmin) return true;
      return permissions.includes(p);
    },
    [isAdmin, permissions],
  );

  const canAny = useCallback(
    (...perms) => {
      if (!perms.length) return true;
      if (isAdmin) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [isAdmin, permissions],
  );

  const canAll = useCallback(
    (...perms) => {
      if (!perms.length) return true;
      if (isAdmin) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [isAdmin, permissions],
  );

  return {
    can,
    canAny,
    canAll,
    permissions,
    arambhRoleKey: arambhRoleKey || null,
    allowed: perm ? can(perm) : true,
  };
}

export default usePermission;
