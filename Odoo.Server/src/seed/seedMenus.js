/**
 * Upsert MenuGroupMaster + MenuMaster so Master → Menu Group / Menu Master
 * match the admin sidebar (legacy + Arambh).
 */
import MenuGroupMaster from '../../models/MenuGroupMaster.js';
import MenuMaster from '../../models/MenuMaster.js';
import { logger } from '../lib/logger.js';

const GROUPS = [
  {
    menuGroupName: 'Dashboard',
    sequence: 1,
    isLink: true,
    menuUrl: '/dashboard',
    icon: 'ri-dashboard-2-line',
    menus: [],
  },
  {
    menuGroupName: 'Setup',
    sequence: 2,
    icon: 'ri-settings-2-line',
    menus: [
      { menuName: 'Company Details', menuUrl: '/company-details', icon: 'ri-building-4-line', sequence: 1 },
      { menuName: 'Department', menuUrl: '/department', icon: 'ri-organization-chart', sequence: 2 },
      { menuName: 'Employee Management', menuUrl: '/employee', icon: 'ri-user-line', sequence: 3 },
      { menuName: 'Employee Roles', menuUrl: '/employee-roles', icon: 'ri-shield-user-line', sequence: 4 },
      { menuName: 'FAQ Category', menuUrl: '/faq-category', icon: 'ri-folder-line', sequence: 5 },
      { menuName: 'FAQ', menuUrl: '/faq', icon: 'ri-question-answer-line', sequence: 6 },
    ],
  },
  {
    menuGroupName: 'Master',
    sequence: 3,
    icon: 'ri-database-2-line',
    menus: [
      { menuName: 'Role Master', menuUrl: '/role-master', icon: 'ri-shield-keyhole-line', sequence: 1 },
      { menuName: 'Menu Group', menuUrl: '/menu-group', icon: 'ri-menu-line', sequence: 2 },
      { menuName: 'Menu Master', menuUrl: '/menu-master', icon: 'ri-list-settings-line', sequence: 3 },
      { menuName: 'Country', menuUrl: '/country', icon: 'ri-map-2-line', sequence: 4 },
      { menuName: 'State', menuUrl: '/state', icon: 'ri-map-pin-line', sequence: 5 },
      { menuName: 'City', menuUrl: '/city', icon: 'ri-community-line', sequence: 6 },
      { menuName: 'Currency Master', menuUrl: '/currency-master', icon: 'ri-money-dollar-circle-line', sequence: 7 },
      { menuName: 'Login Attempt Logs', menuUrl: '/login-attempt-logs', icon: 'ri-lock-password-line', sequence: 8 },
    ],
  },
  {
    menuGroupName: 'CMS',
    sequence: 4,
    icon: 'ri-layout-masonry-line',
    menus: [
      { menuName: 'Email Setup', menuUrl: '/email-setup', icon: 'ri-mail-settings-line', sequence: 1 },
      { menuName: 'Email For', menuUrl: '/email-for', icon: 'ri-mail-line', sequence: 2 },
      { menuName: 'Email To', menuUrl: '/email-to', icon: 'ri-mail-send-line', sequence: 3 },
      { menuName: 'Email Template', menuUrl: '/email-template', icon: 'ri-file-text-line', sequence: 4 },
      { menuName: 'Blog Category', menuUrl: '/blog-category', icon: 'ri-price-tag-3-line', sequence: 5 },
      { menuName: 'Blog Tag', menuUrl: '/blog-tag', icon: 'ri-hashtag', sequence: 6 },
      { menuName: 'Blog Master', menuUrl: '/blog-master', icon: 'ri-article-line', sequence: 7 },
    ],
  },
  {
    menuGroupName: 'Front Desk & Courts',
    sequence: 10,
    icon: 'ri-flashlight-line',
    menus: [
      { menuName: 'Front Desk', menuUrl: '/front-desk', icon: 'ri-flashlight-line', sequence: 1 },
      { menuName: 'Bookings', menuUrl: '/courts/bookings', icon: 'ri-calendar-check-line', sequence: 2 },
      { menuName: 'Courts', menuUrl: '/courts', icon: 'ri-layout-grid-line', sequence: 3 },
    ],
  },
  {
    menuGroupName: 'Members',
    sequence: 11,
    icon: 'ri-group-line',
    menus: [
      { menuName: 'Members', menuUrl: '/members', icon: 'ri-group-line', sequence: 1 },
      { menuName: 'Membership Plans', menuUrl: '/membership-plans', icon: 'ri-vip-crown-line', sequence: 2 },
      { menuName: 'Memberships', menuUrl: '/memberships', icon: 'ri-profile-line', sequence: 3 },
    ],
  },
  {
    menuGroupName: 'POS',
    sequence: 12,
    icon: 'ri-store-2-line',
    menus: [
      { menuName: 'POS Dashboard', menuUrl: '/pos/dashboard', icon: 'ri-dashboard-line', sequence: 1 },
      { menuName: 'POS Terminal', menuUrl: '/pos', icon: 'ri-store-2-line', sequence: 2 },
      { menuName: "Today's orders", menuUrl: '/pos/orders', icon: 'ri-receipt-line', sequence: 3 },
      { menuName: 'Café Master', menuUrl: '/pos/cafes', icon: 'ri-store-3-line', sequence: 4 },
      { menuName: 'Menu Items', menuUrl: '/pos/items', icon: 'ri-cup-line', sequence: 5 },
      { menuName: 'Café Menus', menuUrl: '/pos/menu', icon: 'ri-restaurant-2-line', sequence: 6 },
    ],
  },
  {
    menuGroupName: 'E-commerce',
    sequence: 13,
    icon: 'ri-shopping-cart-2-line',
    menus: [
      { menuName: 'Dashboard', menuUrl: '/ecommerce', icon: 'ri-dashboard-line', sequence: 1 },
      { menuName: 'Products', menuUrl: '/ecommerce/products', icon: 'ri-shopping-bag-3-line', sequence: 2 },
      { menuName: 'Categories', menuUrl: '/ecommerce/categories', icon: 'ri-price-tag-3-line', sequence: 3 },
      { menuName: 'Orders', menuUrl: '/ecommerce/orders', icon: 'ri-shopping-cart-line', sequence: 4 },
      { menuName: 'Inventory', menuUrl: '/ecommerce/inventory', icon: 'ri-archive-line', sequence: 5 },
    ],
  },
  {
    menuGroupName: 'Finance',
    sequence: 14,
    icon: 'ri-bank-line',
    menus: [
      { menuName: 'Customers', menuUrl: '/customers', icon: 'ri-contacts-book-line', sequence: 1 },
      { menuName: 'Invoices', menuUrl: '/finance/invoices', icon: 'ri-file-list-3-line', sequence: 2 },
      { menuName: 'Payments', menuUrl: '/settings/payments', icon: 'ri-bank-card-line', sequence: 3 },
    ],
  },
  {
    menuGroupName: 'Club',
    sequence: 15,
    icon: 'ri-building-line',
    menus: [
      { menuName: 'Club & locations', menuUrl: '/settings/club', icon: 'ri-building-line', sequence: 1 },
      { menuName: 'Taxes', menuUrl: '/settings/taxes', icon: 'ri-percent-line', sequence: 2 },
      { menuName: 'Staff directory', menuUrl: '/staff/directory', icon: 'ri-user-settings-line', sequence: 3 },
      { menuName: 'MCP access', menuUrl: '/settings/mcp', icon: 'ri-key-2-line', sequence: 4 },
    ],
  },
  {
    menuGroupName: 'Help and Guide',
    sequence: 99,
    icon: 'ri-question-line',
    menus: [
      { menuName: 'Guides Gallery', menuUrl: '/guides-gallery', icon: 'ri-gallery-line', sequence: 1 },
      { menuName: 'Manage Guides', menuUrl: '/manage-guides', icon: 'ri-book-2-line', sequence: 2 },
    ],
  },
];

export async function seedMenus() {
  let groupCount = 0;
  let menuCount = 0;

  for (const g of GROUPS) {
    const group = await MenuGroupMaster.findOneAndUpdate(
      { menuGroupName: g.menuGroupName },
      {
        menuGroupName: g.menuGroupName,
        sequence: g.sequence,
        isActive: true,
        isLink: Boolean(g.isLink),
        menuUrl: g.menuUrl || '#',
        icon: g.icon || '',
      },
      { upsert: true, new: true },
    );
    groupCount += 1;

    for (const m of g.menus || []) {
      await MenuMaster.findOneAndUpdate(
        { menuUrl: m.menuUrl },
        {
          menuName: m.menuName,
          menuGroup: group._id,
          menuUrl: m.menuUrl,
          sequence: m.sequence,
          isActive: true,
          isParent: false,
          parentMenu: null,
          icon: m.icon || '',
        },
        { upsert: true, new: true },
      );
      menuCount += 1;
    }
  }

  // Retire obsolete commerce mega-menus / renamed groups
  await MenuGroupMaster.updateMany(
    {
      menuGroupName: {
        $in: [
          'POS & Shop',
          'POS & Café',
          'POS & Cafe',
          'Club & Reports',
          'Finance & Shop',
        ],
      },
    },
    { $set: { isActive: false } },
  );

  // Drop removed screens from Menu Master
  await MenuMaster.updateMany(
    { menuUrl: { $in: ['/kds', '/reports', '/shop/inventory', '/crm/pipeline'] } },
    { $set: { isActive: false } },
  );

  logger.info({ groups: groupCount, menus: menuCount }, 'seeded menu groups + menus');
  return { groups: groupCount, menus: menuCount };
}

export default seedMenus;
