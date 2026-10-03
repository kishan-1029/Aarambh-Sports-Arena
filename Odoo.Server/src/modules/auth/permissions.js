/**
 * Server re-export of Arambh permission strings.
 * Single source: packages/shared/permissions.js (ADR-0005 hybrid layout).
 */
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_PERMISSION_STUBS,
  resolveArambhRoleKey,
  permissionsForRole,
  hasAnyPermission,
  hasAllPermissions,
} from '../../../../packages/shared/permissions.js';

export { default } from '../../../../packages/shared/permissions.js';
