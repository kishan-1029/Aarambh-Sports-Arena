/**
 * Admin sidebar nav for Arambh Sports Arena.
 * - Legacy groups restore Dashboard / Setup / Master / CMS when MenuMaster API is thin
 * - Arambh modules are split across several groups (not one mega-menu)
 */

const item = (name, url, icon, opts = {}) => ({
  id: `nav-${url.replace(/\//g, "-") || "root"}`,
  name,
  url,
  icon,
  isParent: false,
  perm: opts.perm ?? null,
  comingSoon: Boolean(opts.comingSoon),
  badge: opts.comingSoon ? "Soon" : null,
});

/** Flat list for ⌘K / command palette */
export const ARAMBH_ROUTES = [
  { label: "Dashboard", path: "/dashboard", icon: "ri-dashboard-2-line" },
  { label: "Company Details", path: "/company-details", icon: "ri-building-4-line" },
  { label: "Department", path: "/department", icon: "ri-organization-chart" },
  { label: "Employee", path: "/employee", icon: "ri-user-line" },
  { label: "Employee Roles", path: "/employee-roles", icon: "ri-shield-user-line" },
  { label: "Role Master", path: "/role-master", icon: "ri-shield-keyhole-line" },
  { label: "Menu Group", path: "/menu-group", icon: "ri-menu-line" },
  { label: "Menu Master", path: "/menu-master", icon: "ri-list-settings-line" },
  { label: "Country", path: "/country", icon: "ri-map-2-line" },
  { label: "State", path: "/state", icon: "ri-map-pin-line" },
  { label: "City", path: "/city", icon: "ri-community-line" },
  { label: "Currency", path: "/currency-master", icon: "ri-money-dollar-circle-line" },
  { label: "Login Attempts", path: "/login-attempt-logs", icon: "ri-lock-password-line" },
  { label: "Email Setup", path: "/email-setup", icon: "ri-mail-settings-line" },
  { label: "Email For", path: "/email-for", icon: "ri-mail-line" },
  { label: "Email To", path: "/email-to", icon: "ri-mail-send-line" },
  { label: "Email Template", path: "/email-template", icon: "ri-file-text-line" },
  { label: "Blog Master", path: "/blog-master", icon: "ri-article-line" },
  { label: "FAQ", path: "/faq", icon: "ri-question-answer-line" },
  { label: "Front Desk", path: "/front-desk", perm: "booking.view", icon: "ri-flashlight-line" },
  { label: "Bookings", path: "/courts/bookings", perm: "booking.view", icon: "ri-calendar-check-line" },
  { label: "Courts", path: "/courts", perm: "court.view", icon: "ri-layout-grid-line" },
  { label: "Members", path: "/members", perm: "member.view", icon: "ri-group-line" },
  { label: "Membership Plans", path: "/membership-plans", perm: "membership_plan.view", icon: "ri-vip-crown-line" },
  { label: "Memberships", path: "/memberships", perm: "membership.view", icon: "ri-profile-line" },
  { label: "POS Dashboard", path: "/pos/dashboard", perm: "pos.create", icon: "ri-dashboard-line" },
  { label: "POS Terminal", path: "/pos", perm: "pos.create", icon: "ri-store-2-line", fullscreen: true },
  { label: "Today's orders", path: "/pos/orders", perm: "pos.create", icon: "ri-receipt-line" },
  { label: "Café Master", path: "/pos/cafes", perm: "product.edit", icon: "ri-store-3-line" },
  { label: "Menu Items", path: "/pos/items", perm: "product.edit", icon: "ri-cup-line" },
  { label: "Café Menus", path: "/pos/menu", perm: "product.edit", icon: "ri-restaurant-2-line" },
  { label: "Customers", path: "/customers", perm: "customer.view", icon: "ri-contacts-book-line" },
  { label: "Invoices", path: "/finance/invoices", perm: "invoice.view", icon: "ri-money-rupee-circle-line" },
  { label: "Payments", path: "/settings/payments", perm: "payment.manage", icon: "ri-bank-card-line" },
  { label: "Shop inventory", path: "/shop/inventory", perm: "inventory.view", icon: "ri-archive-line", comingSoon: true },
  { label: "Club & locations", path: "/settings/club", perm: "settings.manage", icon: "ri-building-line" },
  { label: "MCP access", path: "/settings/mcp", perm: "mcp.manage", icon: "ri-key-2-line" },
  { label: "Taxes", path: "/settings/taxes", perm: "settings.manage", icon: "ri-percent-line" },
  { label: "Staff directory", path: "/staff/directory", perm: "employee.view", icon: "ri-user-settings-line" },
];

function group(groupId, groupName, icon, menus, extra = {}) {
  return {
    groupId,
    groupName,
    icon,
    isLink: Boolean(extra.isLink),
    url: extra.url,
    menus: menus.map((m) =>
      item(m.name, m.url, m.icon, { perm: m.perm, comingSoon: m.comingSoon }),
    ),
  };
}

/** Classic admin IA — always available even if MenuMaster DB is incomplete */
export function buildLegacyNavGroups() {
  return [
    {
      groupId: "legacy-dashboard",
      groupName: "Dashboard",
      icon: "ri-dashboard-2-line",
      isLink: true,
      url: "/dashboard",
      menus: [],
    },
    group("legacy-setup", "Setup", "ri-settings-2-line", [
      { name: "Company Details", url: "/company-details", icon: "ri-building-4-line" },
      { name: "Department", url: "/department", icon: "ri-organization-chart" },
      { name: "Employee Management", url: "/employee", icon: "ri-user-line" },
      { name: "Employee Roles", url: "/employee-roles", icon: "ri-shield-user-line" },
      { name: "FAQ Category", url: "/faq-category", icon: "ri-folder-line" },
      { name: "FAQ", url: "/faq", icon: "ri-question-answer-line" },
    ]),
    group("legacy-master", "Master", "ri-database-2-line", [
      { name: "Role Master", url: "/role-master", icon: "ri-shield-keyhole-line" },
      { name: "Menu Group", url: "/menu-group", icon: "ri-menu-line" },
      { name: "Menu Master", url: "/menu-master", icon: "ri-list-settings-line" },
      { name: "Country", url: "/country", icon: "ri-map-2-line" },
      { name: "State", url: "/state", icon: "ri-map-pin-line" },
      { name: "City", url: "/city", icon: "ri-community-line" },
      { name: "Currency Master", url: "/currency-master", icon: "ri-money-dollar-circle-line" },
      { name: "Login Attempt Logs", url: "/login-attempt-logs", icon: "ri-lock-password-line" },
    ]),
    group("legacy-cms", "CMS", "ri-layout-masonry-line", [
      { name: "Email Setup", url: "/email-setup", icon: "ri-mail-settings-line" },
      { name: "Email For", url: "/email-for", icon: "ri-mail-line" },
      { name: "Email To", url: "/email-to", icon: "ri-mail-send-line" },
      { name: "Email Template", url: "/email-template", icon: "ri-file-text-line" },
      { name: "Blog Category", url: "/blog-category", icon: "ri-price-tag-3-line" },
      { name: "Blog Tag", url: "/blog-tag", icon: "ri-hashtag" },
      { name: "Blog Master", url: "/blog-master", icon: "ri-article-line" },
    ]),
  ];
}

/** Arambh domain menus — split for readability */
export function buildArambhNavGroups() {
  return [
    group("arambh-front-desk", "Front Desk & Courts", "ri-flashlight-line", [
      { name: "Front Desk", url: "/front-desk", icon: "ri-flashlight-line", perm: "booking.view" },
      { name: "Bookings", url: "/courts/bookings", icon: "ri-calendar-check-line", perm: "booking.view" },
      { name: "Courts", url: "/courts", icon: "ri-layout-grid-line", perm: "court.view" },
    ]),
    group("arambh-members", "Members", "ri-group-line", [
      { name: "Members", url: "/members", icon: "ri-group-line", perm: "member.view" },
      { name: "Membership Plans", url: "/membership-plans", icon: "ri-vip-crown-line", perm: "membership_plan.view" },
      { name: "Memberships", url: "/memberships", icon: "ri-profile-line", perm: "membership.view" },
    ]),
    group("arambh-pos", "POS", "ri-store-2-line", [
      { name: "POS Dashboard", url: "/pos/dashboard", icon: "ri-dashboard-line", perm: "pos.create" },
      { name: "POS Terminal", url: "/pos", icon: "ri-store-2-line", perm: "pos.create" },
      { name: "Today's orders", url: "/pos/orders", icon: "ri-receipt-line", perm: "pos.create" },
      { name: "Café Master", url: "/pos/cafes", icon: "ri-store-3-line", perm: "product.edit" },
      { name: "Menu Items", url: "/pos/items", icon: "ri-cup-line", perm: "product.edit" },
      { name: "Café Menus", url: "/pos/menu", icon: "ri-restaurant-2-line", perm: "product.edit" },
    ]),
    group("arambh-finance", "Finance & Shop", "ri-bank-line", [
      { name: "Customers", url: "/customers", icon: "ri-contacts-book-line", perm: "customer.view" },
      { name: "Invoices", url: "/finance/invoices", icon: "ri-file-list-3-line", perm: "invoice.view" },
      { name: "Payments", url: "/settings/payments", icon: "ri-bank-card-line", perm: "payment.manage" },
      { name: "Shop inventory", url: "/shop/inventory", icon: "ri-archive-line", perm: "inventory.view", comingSoon: true },
    ]),
    group("arambh-club", "Club", "ri-building-line", [
      { name: "Club & locations", url: "/settings/club", icon: "ri-building-line", perm: "settings.manage" },
      { name: "MCP access", url: "/settings/mcp", icon: "ri-key-2-line", perm: "mcp.manage" },
      { name: "Taxes", url: "/settings/taxes", icon: "ri-percent-line", perm: "settings.manage" },
      { name: "Staff directory", url: "/staff/directory", icon: "ri-user-settings-line", perm: "employee.view" },
    ]),
  ];
}

/** @deprecated use buildArambhNavGroups — kept for any old imports */
export function buildArambhNavGroup() {
  return buildArambhNavGroups()[0];
}

export const ARAMBH_NAV_GROUP_ID = "arambh-modules";

export const ARAMBH_APP_PATHS = ARAMBH_ROUTES.filter((r) => !r.fullscreen).map(
  (r) => r.path,
);

export const ARAMBH_FULLSCREEN_PATHS = ARAMBH_ROUTES.filter((r) => r.fullscreen).map(
  (r) => r.path,
);

/**
 * Merge legacy + API MenuMaster + Arambh groups.
 * Dedupes by groupName (case-insensitive); legacy/Dashboard/Setup win over empty API.
 */
export function mergeAdminNavGroups(apiGroups = [], arambhGroups = [], legacyGroups = []) {
  const out = [];
  const seen = new Set();

  const push = (g) => {
    if (!g?.groupName) return;
    const key = String(g.groupName).trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(g);
  };

  for (const g of legacyGroups) push(g);
  const arambhNames = new Set(
    (arambhGroups || [])
      .map((g) => String(g.groupName || "").trim().toLowerCase())
      .filter(Boolean),
  );

  for (const g of apiGroups || []) {
    const key = String(g.groupName || "").trim().toLowerCase();
    // Skip API groups we already covered via legacy (Setup/Master/CMS/Dashboard)
    // or via the coded Arambh nav (icons, permissions, child items).
    if (["setup", "master", "cms", "dashboard"].includes(key)) continue;
    // Drop obsolete POS & Shop / POS & Café menu groups from MenuMaster seed
    if (key === "pos & shop" || key === "pos & café" || key === "pos & cafe") continue;
    if (arambhNames.has(key)) continue;
    push(g);
  }
  for (const g of arambhGroups) push(g);

  return out;
}

const ICON_BY_PATH = Object.fromEntries(
  ARAMBH_ROUTES.filter((r) => r.icon).map((r) => [r.path, r.icon]),
);

/** Remix class for a sidebar URL when the stored menu has no icon. */
export function iconForMenuUrl(url) {
  if (!url) return "";
  return ICON_BY_PATH[url] || "";
}
