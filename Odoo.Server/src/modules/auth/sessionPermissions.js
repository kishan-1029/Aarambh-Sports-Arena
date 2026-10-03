/**
 * Resolve Arambh string permissions for a session user.
 * Keeps legacy menu CRUD on session.user.permissions untouched.
 */
import RoleMaster from '../../../models/RoleMaster.js';
import {
  PERMISSIONS,
  permissionsForRole,
  resolveArambhRoleKey,
} from './permissions.js';
import { ArambhRole } from './role.model.js';

/**
 * @param {{
 *   role?: string,
 *   roleId?: string|null,
 *   arambhRoleKey?: string|null,
 * }} sessionUser
 * @param {{ roleName?: string|null }} [opts]
 * @returns {Promise<{ stringPermissions: string[], arambhRoleKey: string|null }>}
 */
export async function resolveStringPermissions(sessionUser, opts = {}) {
  if (!sessionUser) {
    return { stringPermissions: [], arambhRoleKey: null };
  }

  // Company / system admin → full set (matches checkPermission ADMIN bypass)
  if (sessionUser.role === 'ADMIN') {
    return {
      stringPermissions: [...PERMISSIONS],
      arambhRoleKey: 'owner',
    };
  }

  let roleKey = sessionUser.arambhRoleKey || null;

  if (!roleKey && opts.roleName) {
    roleKey = resolveArambhRoleKey(opts.roleName);
  }

  if (!roleKey && sessionUser.roleId) {
    try {
      const roleDoc = await RoleMaster.findById(sessionUser.roleId)
        .select('roleName')
        .lean();
      roleKey = resolveArambhRoleKey(roleDoc?.roleName);
    } catch {
      roleKey = null;
    }
  }

  if (!roleKey) {
    return { stringPermissions: [], arambhRoleKey: null };
  }

  // Prefer DB seed document when present; fall back to shared map
  try {
    const seeded = await ArambhRole.findOne({
      key: roleKey,
      isActive: true,
    })
      .select('permissions')
      .lean();
    if (seeded?.permissions?.length) {
      return {
        stringPermissions: [...seeded.permissions],
        arambhRoleKey: roleKey,
      };
    }
  } catch {
    /* memory mongo / missing collection — use static map */
  }

  return {
    stringPermissions: permissionsForRole(roleKey),
    arambhRoleKey: roleKey,
  };
}

/**
 * Mutate session user with stringPermissions (does not touch menu permissions).
 * @param {Record<string, unknown>} sessionUser
 * @param {{ roleName?: string|null }} [opts]
 */
export async function attachStringPermissions(sessionUser, opts = {}) {
  const { stringPermissions, arambhRoleKey } = await resolveStringPermissions(
    sessionUser,
    opts,
  );
  sessionUser.stringPermissions = stringPermissions;
  sessionUser.arambhRoleKey = arambhRoleKey;
  return sessionUser;
}

export default {
  resolveStringPermissions,
  attachStringPermissions,
};
