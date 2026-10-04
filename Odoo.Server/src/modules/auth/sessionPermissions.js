/**
 * Resolve Arambh string permissions for a session user.
 * Keeps legacy menu CRUD on session.user.permissions untouched.
 */
import mongoose from 'mongoose';
import RoleMaster from '../../../models/RoleMaster.js';
import MenuMaster from '../../../models/MenuMaster.js';
import MenuGroupMaster from '../../../models/MenuGroupMaster.js';
import {
  PERMISSIONS,
  permissionsForRole,
  resolveArambhRoleKey,
} from './permissions.js';
import { ArambhRole } from './role.model.js';
import { permissionsForMenuFlags } from '../../../../packages/shared/menuGrantPermissions.js';

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

const idList = (grants, field) =>
  (Array.isArray(grants) ? grants : [])
    .map((grant) => grant?.[field])
    .filter((id) => id != null && id !== '')
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

/**
 * String permissions implied by Employee Roles checkboxes.
 * Menu CRUD on session.user.permissions is left unchanged.
 * @param {Array<Record<string, unknown>>|undefined} grants
 * @returns {Promise<string[]>}
 */
export async function permissionsFromMenuGrants(grants) {
  const menuIds = idList(grants, 'menuId');
  const groupIds = idList(grants, 'menuGroupId');
  if (!menuIds.length && !groupIds.length) return [];

  const [menus, groups] = await Promise.all([
    menuIds.length
      ? MenuMaster.find({ _id: { $in: menuIds } }).select('menuUrl').lean()
      : [],
    groupIds.length
      ? MenuGroupMaster.find({ _id: { $in: groupIds } }).select('menuUrl').lean()
      : [],
  ]);

  const urlById = new Map();
  for (const menu of menus) urlById.set(String(menu._id), menu.menuUrl);
  for (const group of groups) urlById.set(String(group._id), group.menuUrl);

  const out = new Set();
  for (const grant of grants) {
    const id = grant.menuId || grant.menuGroupId;
    const url = id != null ? urlById.get(String(id)) : null;
    for (const perm of permissionsForMenuFlags(url, grant)) out.add(perm);
  }
  return [...out];
}

/**
 * Mutate session user with stringPermissions (does not touch menu permissions).
 * Role-name template permissions are kept, and checked modules are added.
 * @param {Record<string, unknown>} sessionUser
 * @param {{ roleName?: string|null }} [opts]
 */
export async function attachStringPermissions(sessionUser, opts = {}) {
  const { stringPermissions, arambhRoleKey } = await resolveStringPermissions(
    sessionUser,
    opts,
  );
  const fromMenus =
    sessionUser?.role === 'ADMIN'
      ? []
      : await permissionsFromMenuGrants(sessionUser?.permissions);
  sessionUser.stringPermissions = [...new Set([...stringPermissions, ...fromMenus])];
  sessionUser.arambhRoleKey = arambhRoleKey;
  const stamp = sessionUser.permissionsUpdatedAt
    ? new Date(sessionUser.permissionsUpdatedAt).toISOString()
    : 'none';
  sessionUser.menuGrantSyncAt = stamp;
  return sessionUser;
}

export default {
  resolveStringPermissions,
  attachStringPermissions,
  permissionsFromMenuGrants,
};
