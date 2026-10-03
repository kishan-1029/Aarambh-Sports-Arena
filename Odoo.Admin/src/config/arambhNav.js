/**
 * Static Arambh Sports Arena nav — merged after API MenuMaster groups.
 * `perm` gates visibility via usePermission (ADMIN sees all).
 * Coming-soon items share ComingSoon page; live sample: Staff directory.
 */

export const ARAMBH_NAV_GROUP_ID = "arambh-modules";

/** Flat list for command palette search */
export const ARAMBH_ROUTES = [
  { label: "Dashboard", path: "/dashboard", perm: null, icon: "ri-home-line" },
  { label: "Front Desk", path: "/front-desk", perm: "booking.view", icon: "ri-flashlight-line", comingSoon: true },
  { label: "Bookings", path: "/courts/bookings", perm: "booking.view", icon: "ri-calendar-check-line", comingSoon: true },
  { label: "Courts", path: "/courts", perm: "court.view", icon: "ri-layout-grid-line", comingSoon: true },
  { label: "Members", path: "/members", perm: "member.view", icon: "ri-group-line", comingSoon: true },
  { label: "Membership Plans", path: "/membership-plans", perm: "membership_plan.view", icon: "ri-vip-crown-line", comingSoon: true },
  { label: "POS", path: "/pos", perm: "pos.create", icon: "ri-store-2-line", comingSoon: true, fullscreen: true },
  { label: "Kitchen Display (KDS)", path: "/kds", perm: "kds.view", icon: "ri-restaurant-line", comingSoon: true },
  { label: "Shop / Inventory", path: "/shop/inventory", perm: "inventory.view", icon: "ri-shopping-bag-3-line", comingSoon: true },
  { label: "CRM", path: "/crm/pipeline", perm: "lead.view", icon: "ri-customer-service-2-line", comingSoon: true },
  { label: "Finance", path: "/finance/invoices", perm: "invoice.view", icon: "ri-money-rupee-circle-line", comingSoon: true },
  { label: "Staff directory", path: "/staff/directory", perm: "employee.view", icon: "ri-user-settings-line" },
  { label: "HR", path: "/staff", perm: "employee.view", icon: "ri-team-line", comingSoon: true },
  { label: "Reports", path: "/reports", perm: "report.view", icon: "ri-bar-chart-box-line", comingSoon: true },
  { label: "Settings", path: "/settings", perm: "settings.manage", icon: "ri-settings-3-line", comingSoon: true },
  { label: "Role Master", path: "/role-master", perm: null, icon: "ri-shield-user-line" },
  { label: "Employees", path: "/employee", perm: null, icon: "ri-user-line" },
];

/**
 * Menu group shape compatible with VerticalLayout / MenuContext rendering.
 */
export function buildArambhNavGroup() {
  const modules = ARAMBH_ROUTES.filter(
    (r) =>
      r.path !== "/dashboard" &&
      r.path !== "/role-master" &&
      r.path !== "/employee",
  );

  return {
    groupId: ARAMBH_NAV_GROUP_ID,
    groupName: "Arambh",
    icon: "ri-trophy-line",
    isLink: false,
    menus: modules.map((r) => ({
      id: `arambh-${r.path.replace(/\//g, "-")}`,
      name: r.comingSoon ? `${r.label}` : r.label,
      url: r.path,
      icon: r.icon,
      isParent: false,
      perm: r.perm,
      comingSoon: Boolean(r.comingSoon),
      badge: r.comingSoon ? "Soon" : null,
    })),
  };
}

/** Paths that use App shell + ComingSoon / Staff directory (not fullscreen). */
export const ARAMBH_APP_PATHS = ARAMBH_ROUTES.filter((r) => !r.fullscreen).map(
  (r) => r.path,
);

export const ARAMBH_FULLSCREEN_PATHS = ARAMBH_ROUTES.filter((r) => r.fullscreen).map(
  (r) => r.path,
);
