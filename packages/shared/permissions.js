/**
 * Arambh Sports Arena — permission strings (single source of truth).
 * Format: resource.action
 *
 * Consumed by Odoo.Server/src/modules/auth/permissions.js (re-export)
 * and admin usePermission / Can helpers.
 */

/** @type {readonly string[]} */
export const PERMISSIONS = Object.freeze([
  // dashboard / audit / settings
  'dashboard.view',
  'audit.view',
  'audit.export',
  'settings.manage',
  'user.read',
  'user.manage',
  'role.read',
  'role.manage',

  // members / membership
  'member.view',
  'member.create',
  'member.edit',
  'member.export',
  'membership.view',
  'membership.create',
  'membership.edit',
  'membership.cancel',
  'membership.refund',
  'membership_plan.view',
  'membership_plan.edit',

  // courts / bookings
  'court.view',
  'court.manage',
  'court_block.create',
  'booking.view',
  'booking.create',
  'booking.edit',
  'booking.cancel',
  'booking.refund',
  'social_session.view',
  'social_session.create',
  'social_session.edit',

  // catalogue / inventory
  'product.view',
  'product.edit',
  'inventory.view',
  'inventory.create',
  'inventory.export',
  'inventory.approve',
  'purchase_order.view',
  'purchase_order.create',
  'purchase_order.edit',
  'purchase_order.approve',
  'order.view',
  'order.edit',
  'order.cancel',
  'order.refund',

  // POS / bar
  'pos.create',
  'pos_session.view',
  'pos_session.own',
  'pos_session.approve',
  'pos.refund',
  'kds.view',
  'kds.edit',

  // CRM / customers / finance
  'lead.view',
  'lead.create',
  'lead.edit',
  'lead.manage',
  'customer.view',
  'customer.create',
  'customer.edit',
  'invoice.view',
  'invoice.create',
  'invoice.manage',
  'payment.create',
  'payment.manage',
  'expense.create',
  'expense.manage',
  'report.view',
  'report.export',

  // HR (stubs for later phases)
  'employee.view',
  'employee.manage',
  'leave.approve',
  'payroll.view',

  // AI / MCP
  'ai_admin.view',
  'ai_admin.manage',
  'mcp.manage',
]);

/**
 * Expand shorthand "all" / action lists into concrete permission strings
 * for resources that exist in PERMISSIONS.
 * @param {string} resource
 * @param {string[]|'all'} actions
 */
function expand(resource, actions) {
  if (actions === 'all') {
    return PERMISSIONS.filter((p) => p.startsWith(`${resource}.`));
  }
  return actions.map((a) => `${resource}.${a}`);
}

/**
 * Role → permission strings for the five Phase-2 demo roles (+ owner = full).
 * Aligned with docs/06-Auth-RBAC.md matrix (subset of columns).
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze([...PERMISSIONS]),

  manager: Object.freeze([
    ...expand('dashboard', ['view']),
    ...expand('member', ['view', 'create', 'edit', 'export']),
    ...expand('membership', ['view', 'create', 'edit', 'cancel']),
    ...expand('membership_plan', ['view', 'edit']),
    ...expand('court', ['view', 'manage']),
    ...expand('court_block', ['create']),
    ...expand('booking', ['view', 'create', 'edit', 'cancel', 'refund']),
    ...expand('social_session', ['view', 'create', 'edit']),
    ...expand('product', ['view', 'edit']),
    ...expand('inventory', ['view', 'create', 'export', 'approve']),
    ...expand('purchase_order', ['view', 'create', 'edit', 'approve']),
    ...expand('order', ['view', 'edit', 'cancel', 'refund']),
    ...expand('pos', ['create', 'refund']),
    ...expand('pos_session', ['view', 'approve']),
    ...expand('kds', ['view']),
    ...expand('lead', ['view', 'create', 'edit', 'manage']),
    ...expand('customer', ['view', 'create', 'edit']),
    ...expand('invoice', ['view']),
    ...expand('expense', ['create']),
    ...expand('employee', ['view']),
    ...expand('leave', ['approve']),
    ...expand('report', ['view', 'export']),
    ...expand('settings', ['manage']),
    ...expand('ai_admin', ['view']),
    ...expand('audit', ['view']),
  ]),

  front_desk: Object.freeze([
    ...expand('member', ['view', 'create', 'edit']),
    ...expand('customer', ['view', 'create', 'edit']),
    ...expand('membership', ['view', 'create']),
    ...expand('membership_plan', ['view']),
    ...expand('court', ['view']),
    ...expand('court_block', ['create']),
    ...expand('booking', ['view', 'create', 'edit', 'cancel']),
    ...expand('social_session', ['view', 'create', 'edit']),
    ...expand('product', ['view']),
    ...expand('inventory', ['view']),
    ...expand('order', ['view', 'edit']),
    ...expand('pos', ['create']),
    ...expand('pos_session', ['own']),
    ...expand('lead', ['view', 'create', 'edit']),
    ...expand('payment', ['create']),
  ]),

  bar_staff: Object.freeze([
    ...expand('member', ['view']),
    ...expand('product', ['view']),
    ...expand('inventory', ['view']),
    ...expand('pos', ['create']),
    ...expand('pos_session', ['own']),
    ...expand('kds', ['view', 'edit']),
    ...expand('payment', ['create']),
    ...expand('report', ['view']),
  ]),

  finance: Object.freeze([
    ...expand('dashboard', ['view']),
    ...expand('member', ['view']),
    ...expand('membership', ['view', 'refund']),
    ...expand('membership_plan', ['view']),
    ...expand('booking', ['view', 'refund']),
    ...expand('product', ['view']),
    ...expand('inventory', ['view', 'export']),
    ...expand('purchase_order', ['view', 'approve']),
    ...expand('order', ['view', 'refund']),
    ...expand('pos_session', ['view']),
    ...expand('pos', ['refund']),
    ...expand('lead', ['view']),
    ...expand('customer', ['view', 'create', 'edit']),
    ...expand('invoice', ['view', 'create', 'manage']),
    ...expand('payment', ['create', 'manage']),
    ...expand('expense', ['create', 'manage']),
    ...expand('employee', ['view']),
    ...expand('payroll', ['view']),
    ...expand('report', ['view', 'export']),
    ...expand('settings', ['manage']),
    ...expand('audit', ['view']),
  ]),
});

/** @deprecated use ROLE_PERMISSIONS */
export const ROLE_PERMISSION_STUBS = ROLE_PERMISSIONS;

/**
 * Map free-text RoleMaster.roleName → Arambh role key.
 * @param {string|null|undefined} roleName
 * @returns {string|null}
 */
export function resolveArambhRoleKey(roleName) {
  if (!roleName || typeof roleName !== 'string') return null;
  const n = roleName.trim().toLowerCase().replace(/[\s-]+/g, '_');
  /** @type {Record<string, string>} */
  const aliases = {
    owner: 'owner',
    admin: 'owner',
    club_owner: 'owner',
    manager: 'manager',
    club_manager: 'manager',
    front_desk: 'front_desk',
    frontdesk: 'front_desk',
    receptionist: 'front_desk',
    bar_staff: 'bar_staff',
    bar: 'bar_staff',
    cafeteria: 'bar_staff',
    finance: 'finance',
    accountant: 'finance',
    accounts: 'finance',
  };
  if (aliases[n]) return aliases[n];
  if (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, n)) return n;
  return null;
}

/**
 * @param {string} roleKey
 * @returns {string[]}
 */
export function permissionsForRole(roleKey) {
  const list = ROLE_PERMISSIONS[roleKey];
  return list ? [...list] : [];
}

/**
 * @param {Iterable<string>|null|undefined} have
 * @param {string[]} need any-of
 */
export function hasAnyPermission(have, need) {
  if (!need?.length) return true;
  const set = have instanceof Set ? have : new Set(have || []);
  return need.some((p) => set.has(p));
}

/**
 * @param {Iterable<string>|null|undefined} have
 * @param {string[]} need all-of
 */
export function hasAllPermissions(have, need) {
  if (!need?.length) return true;
  const set = have instanceof Set ? have : new Set(have || []);
  return need.every((p) => set.has(p));
}

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_PERMISSION_STUBS,
  resolveArambhRoleKey,
  permissionsForRole,
  hasAnyPermission,
  hasAllPermissions,
};
