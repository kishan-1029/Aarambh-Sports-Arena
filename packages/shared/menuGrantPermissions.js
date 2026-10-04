/**
 * Menu-module checkboxes (Employee Roles) → Arambh string permissions,
 * and the sidebar rule that an assigned module must stay visible.
 *
 * Role-name templates (Front Desk, Manager, …) still grant their own set.
 * A checked module adds access; it does not remove the template.
 */

export function normalizeMenuUrl(url) {
  if (url == null || url === "" || url === "#") return null;
  const path = String(url).split("?")[0].replace(/\/+$/, "");
  return path || "/";
}

/**
 * Any grant (read/write/edit/delete/print/mail) unlocks the screen (`read` list).
 * write / edit / delete add the action permissions for that screen.
 * @type {Readonly<Record<string, { read?: string[], write?: string[], edit?: string[], delete?: string[] }>>}
 */
const BY_URL = Object.freeze({
  "/dashboard": { read: ["dashboard.view"] },
  "/front-desk": {
    read: ["booking.view"],
    write: ["booking.create"],
    edit: ["booking.edit"],
    delete: ["booking.cancel"],
  },
  "/courts/bookings": {
    read: ["booking.view"],
    write: ["booking.create"],
    edit: ["booking.edit"],
    delete: ["booking.cancel"],
  },
  "/courts": {
    read: ["court.view"],
    write: ["court.manage"],
    edit: ["court.manage"],
  },
  "/members": {
    read: ["member.view"],
    write: ["member.create"],
    edit: ["member.edit"],
  },
  "/membership-plans": {
    read: ["membership_plan.view"],
    write: ["membership_plan.edit"],
    edit: ["membership_plan.edit"],
  },
  "/memberships": {
    read: ["membership.view"],
    write: ["membership.create"],
    edit: ["membership.edit"],
    delete: ["membership.cancel"],
  },
  "/pos": { read: ["pos.create"] },
  "/pos/dashboard": { read: ["pos.create"] },
  "/pos/orders": { read: ["pos.create"] },
  "/pos/cafes": {
    read: ["product.view"],
    write: ["product.edit"],
    edit: ["product.edit"],
  },
  "/pos/items": {
    read: ["product.view"],
    write: ["product.edit"],
    edit: ["product.edit"],
  },
  "/pos/menu": {
    read: ["product.view"],
    write: ["product.edit"],
    edit: ["product.edit"],
  },
  "/ecommerce": { read: ["product.view", "order.view", "inventory.view"] },
  "/ecommerce/products": {
    read: ["product.view"],
    write: ["product.edit"],
    edit: ["product.edit"],
  },
  "/ecommerce/categories": {
    read: ["product.view"],
    write: ["product.edit"],
    edit: ["product.edit"],
  },
  "/ecommerce/orders": {
    read: ["order.view"],
    write: ["order.edit"],
    edit: ["order.edit"],
    delete: ["order.cancel"],
  },
  "/ecommerce/inventory": {
    read: ["inventory.view"],
    write: ["inventory.create"],
  },
  "/shop/inventory": { read: ["inventory.view"], write: ["inventory.create"] },
  "/customers": {
    read: ["customer.view"],
    write: ["customer.create"],
    edit: ["customer.edit"],
  },
  "/finance/invoices": {
    read: ["invoice.view"],
    write: ["invoice.create"],
    edit: ["invoice.manage"],
  },
  "/settings/payments": { read: ["payment.manage", "invoice.view"] },
  "/settings/taxes": { read: ["settings.manage"] },
  "/staff/directory": { read: ["employee.view"] },
  "/employee": {
    read: ["employee.view"],
    write: ["employee.manage"],
    edit: ["employee.manage"],
  },
  "/employee-roles": { read: ["role.read"], edit: ["role.manage"], write: ["role.manage"] },
  "/role-master": { read: ["role.read"], edit: ["role.manage"], write: ["role.manage"] },
});

const hasAnyFlag = (flags) =>
  !!(flags?.read || flags?.write || flags?.edit || flags?.delete || flags?.print || flags?.mail);

/**
 * @param {string|null|undefined} url
 * @param {{ read?: boolean, write?: boolean, edit?: boolean, delete?: boolean, print?: boolean, mail?: boolean }} [flags]
 * @returns {string[]}
 */
export function permissionsForMenuFlags(url, flags = {}) {
  if (!hasAnyFlag(flags)) return [];
  const spec = BY_URL[normalizeMenuUrl(url)];
  if (!spec) return [];
  const out = new Set(spec.read || []);
  if (flags.write) for (const p of spec.write || []) out.add(p);
  if (flags.edit) for (const p of spec.edit || []) out.add(p);
  if (flags.delete) for (const p of spec.delete || []) out.add(p);
  return [...out];
}

const ALWAYS_OPEN = new Set(["/", "/dashboard", "/profile"]);

/** List screens whose /:id (or /new) pages belong to the same assigned module. */
const DETAIL_PARENTS = [
  "/members",
  "/finance/invoices",
  "/ecommerce/products",
  "/ecommerce/orders",
];

/** Every navigable URL in a menu tree (groups, items, children). */
export function collectMenuUrls(groups) {
  const urls = new Set();
  const walk = (nodes) => {
    for (const node of nodes || []) {
      const url = normalizeMenuUrl(node?.url);
      if (url) urls.add(url);
      if (node?.children?.length) walk(node.children);
      if (node?.menus?.length) walk(node.menus);
    }
  };
  walk(groups);
  return urls;
}

/**
 * Employee sidebar rule: a screen is visible only when that menu or menu
 * group was checked. Role-name templates do not add extra items.
 *
 * @param {{ url?: string|null, grantedUrls?: Set<string>|null }} item
 */
export function isAssignedNavVisible({ url, grantedUrls = null }) {
  const normalized = normalizeMenuUrl(url);
  return !!(normalized && grantedUrls?.has(normalized));
}

/**
 * Employee route rule. Landing pages stay open. Every other screen, including
 * detail pages under an assigned list, requires that assigned URL.
 * @param {string} path
 * @param {Set<string>|null|undefined} grantedUrls
 */
export function employeeRouteAllowed(path, grantedUrls) {
  const normalized = normalizeMenuUrl(path);
  if (!normalized) return false;
  if (ALWAYS_OPEN.has(normalized)) return true;
  if (!grantedUrls) return false;
  if (grantedUrls.has(normalized)) return true;
  for (const parent of DETAIL_PARENTS) {
    if (grantedUrls.has(parent) && normalized.startsWith(`${parent}/`)) return true;
  }
  return false;
}
