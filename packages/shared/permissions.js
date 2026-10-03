/**
 * Permission strings stub — full matrix in Phase 2.
 * Format: resource.action
 */
export const PERMISSIONS = Object.freeze([
  'audit.read',
  'settings.manage',
  'user.read',
  'user.manage',
  'role.read',
  'role.manage',
  'booking.create',
  'booking.cancel',
  'booking.read',
  'member.read',
  'member.manage',
  'inventory.move',
  'pos.operate',
  'finance.read',
  'finance.manage',
]);

/** @type {Record<string, string[]>} */
export const ROLE_PERMISSION_STUBS = Object.freeze({
  owner: [...PERMISSIONS],
  manager: PERMISSIONS.filter((p) => !p.startsWith('role.')),
  front_desk: [
    'booking.create',
    'booking.cancel',
    'booking.read',
    'member.read',
    'member.manage',
  ],
  bar_staff: ['pos.operate', 'inventory.move'],
  finance: ['finance.read', 'finance.manage', 'audit.read'],
});

export default { PERMISSIONS, ROLE_PERMISSION_STUBS };
