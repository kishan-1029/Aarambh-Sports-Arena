/**
 * Demo RoleMaster + EmployeeRoles + Employee accounts for login testing.
 * Password for every demo staff user: Demo@12345
 */
import bcrypt from 'bcrypt';
import { logger } from '../lib/logger.js';
import RoleMaster from '../../models/RoleMaster.js';
import EmployeeRoles from '../../models/EmployeeRoles.js';
import Employee from '../../models/Employee.js';
import Department from '../../models/Department.js';
import Country from '../../models/Country.js';
import State from '../../models/State.js';
import City from '../../models/City.js';
import MenuMaster from '../../models/MenuMaster.js';
import MenuGroupMaster from '../../models/MenuGroupMaster.js';
import CompanyMaster from '../../models/CompanyMaster.js';
import { seedArambhRoles } from '../modules/auth/seedRoles.js';

/** Shared demo password — local / evaluator testing only */
export const DEMO_STAFF_PASSWORD = 'Demo@12345';

/**
 * RoleMaster.roleName → menu URLs granted (read/write/edit).
 * Names must resolve via resolveArambhRoleKey → ROLE_PERMISSIONS.
 */
const STAFF = [
  {
    roleName: 'POS Admin',
    arambhKey: 'pos_admin',
    employeeName: 'Priya POS Admin',
    email: 'pos.admin@arambh.demo',
    menus: [
      '/dashboard',
      '/pos/dashboard',
      '/pos',
      '/pos/orders',
      '/pos/cafes',
      '/pos/items',
      '/pos/menu',
    ],
  },
  {
    roleName: 'Ecom Admin',
    arambhKey: 'ecom_admin',
    employeeName: 'Kabir Ecom Admin',
    email: 'ecom.admin@arambh.demo',
    menus: [
      '/dashboard',
      '/ecommerce',
      '/ecommerce/products',
      '/ecommerce/categories',
      '/ecommerce/orders',
      '/ecommerce/inventory',
      '/customers',
      '/finance/invoices',
      '/settings/payments',
    ],
  },
  {
    roleName: 'Front Desk',
    arambhKey: 'front_desk',
    employeeName: 'Ananya Front Desk',
    email: 'frontdesk@arambh.demo',
    menus: [
      '/dashboard',
      '/front-desk',
      '/courts',
      '/courts/bookings',
      '/members',
      '/membership-plans',
      '/memberships',
      '/customers',
    ],
  },
  {
    roleName: 'Bar Staff',
    arambhKey: 'bar_staff',
    employeeName: 'Rohit Bar Staff',
    email: 'bar@arambh.demo',
    menus: ['/dashboard', '/pos/dashboard', '/pos', '/pos/orders'],
  },
  {
    roleName: 'Finance',
    arambhKey: 'finance',
    employeeName: 'Meera Finance',
    email: 'finance@arambh.demo',
    menus: [
      '/dashboard',
      '/customers',
      '/finance/invoices',
      '/settings/payments',
      '/settings/taxes',
      '/members',
      '/memberships',
    ],
  },
  {
    roleName: 'Club Manager',
    arambhKey: 'manager',
    employeeName: 'Vikram Club Manager',
    email: 'manager@arambh.demo',
    /** Club ops — not Setup/Master/CMS shell */
    menus: [
      '/dashboard',
      '/front-desk',
      '/courts',
      '/courts/bookings',
      '/members',
      '/membership-plans',
      '/memberships',
      '/pos/dashboard',
      '/pos',
      '/pos/orders',
      '/ecommerce',
      '/ecommerce/products',
      '/ecommerce/orders',
      '/customers',
      '/finance/invoices',
      '/settings/payments',
      '/settings/club',
      '/staff/directory',
    ],
  },
];

const ARAMBH_MENU_URLS = [
  '/dashboard',
  '/front-desk',
  '/courts',
  '/courts/bookings',
  '/members',
  '/membership-plans',
  '/memberships',
  '/pos/dashboard',
  '/pos',
  '/pos/orders',
  '/pos/cafes',
  '/pos/items',
  '/pos/menu',
  '/ecommerce',
  '/ecommerce/products',
  '/ecommerce/categories',
  '/ecommerce/orders',
  '/ecommerce/inventory',
  '/customers',
  '/finance/invoices',
  '/settings/payments',
  '/settings/taxes',
  '/staff/directory',
];

async function resolveGeo() {
  let country =
    (await Country.findOne({ countryName: /india/i }).lean()) ||
    (await Country.findOne({ CountryName: /india/i }).lean());
  if (!country) {
    country = await Country.findOne({ isActive: true }).lean();
  }
  let state = await State.findOne({
    countryId: country?._id,
    stateName: /gujarat/i,
  }).lean();
  if (!state) {
    state = await State.findOne({ countryId: country?._id, isActive: true }).lean();
  }
  if (!state) {
    state = await State.findOne({ isActive: true }).lean();
  }
  let city = await City.findOne({
    stateId: state?._id,
    cityName: /vadodara|ahmedabad/i,
  }).lean();
  if (!city) {
    city = await City.findOne({ stateId: state?._id, isActive: true }).lean();
  }
  if (!city) {
    city = await City.findOne({ isActive: true }).lean();
  }
  if (!country?._id || !state?._id || !city?._id) {
    throw new Error('seedStaff: need Country / State / City (run seedMasterLocations)');
  }
  return { country, state, city };
}

async function ensureDepartment() {
  let dept = await Department.findOne({ departmentCode: 'OPS' }).lean();
  if (dept) return dept;
  dept = await Department.findOne({ departmentName: /ops|sales|hr/i }).lean();
  if (dept) return dept;
  const created = await Department.create({
    departmentName: 'Operations',
    departmentCode: 'OPS',
    isActive: true,
  });
  return created.toObject();
}

async function buildMenuAcl(urls) {
  const list = urls === 'all-arambh' ? ARAMBH_MENU_URLS : urls;
  const roles = [];
  const seenGroups = new Set();

  for (const url of list) {
    const menu = await MenuMaster.findOne({ menuUrl: url, isActive: true }).lean();
    if (!menu) continue;
    const groupId = menu.menuGroup;
    roles.push({
      menuId: menu._id,
      menuGroupId: groupId || null,
      read: true,
      write: true,
      delete: false,
      edit: true,
      print: false,
      mail: false,
    });
    if (groupId && !seenGroups.has(String(groupId))) {
      seenGroups.add(String(groupId));
      roles.push({
        menuId: null,
        menuGroupId: groupId,
        read: true,
        write: false,
        delete: false,
        edit: false,
        print: false,
        mail: false,
      });
    }
  }

  // Dashboard group is often isLink-only (no MenuMaster row)
  const dashGroup = await MenuGroupMaster.findOne({
    menuGroupName: 'Dashboard',
    isActive: true,
  }).lean();
  if (dashGroup && !seenGroups.has(String(dashGroup._id))) {
    roles.push({
      menuId: null,
      menuGroupId: dashGroup._id,
      read: true,
      write: false,
      delete: false,
      edit: false,
      print: false,
      mail: false,
    });
  }

  return roles;
}

export async function seedStaff() {
  await seedArambhRoles();

  const { country, state, city } = await resolveGeo();
  const dept = await ensureDepartment();
  const passwordHash = await bcrypt.hash(DEMO_STAFF_PASSWORD, 10);

  const created = [];

  for (const def of STAFF) {
    const role = await RoleMaster.findOneAndUpdate(
      { roleName: def.roleName },
      { roleName: def.roleName, isActive: true },
      { upsert: true, new: true },
    );

    const acl = await buildMenuAcl(def.menus);
    await EmployeeRoles.findOneAndUpdate(
      { roleId: role._id },
      { roleId: role._id, roles: acl, isActive: true },
      { upsert: true, new: true },
    );

    let emp = await Employee.findOne({
      $or: [{ emailOffice: def.email }, { email: def.email }],
    });
    const payload = {
      employeeName: def.employeeName,
      departmentId: dept._id,
      roleId: role._id,
      emailOffice: def.email,
      email: def.email,
      mobileNumber: '9999900000',
      countryId: country._id,
      stateId: state._id,
      cityId: city._id,
      address: 'Arambh Sports Arena, Vadodara',
      password: passwordHash,
      isActive: true,
    };
    if (emp) {
      Object.assign(emp, payload);
      await emp.save();
    } else {
      emp = await Employee.create(payload);
    }

    created.push({
      email: emp.emailOffice,
      role: def.roleName,
      arambhKey: def.arambhKey,
      name: emp.employeeName,
    });
  }

  // Ensure company super-admin password is known for full-access testing
  // (use collection update — some company docs miss required master fields)
  const admin = await CompanyMaster.findOne({ email: 'admin@demo.com' })
    .select('_id email')
    .lean();
  if (admin?._id) {
    await CompanyMaster.collection.updateOne(
      { _id: admin._id },
      {
        $set: {
          password: passwordHash,
          isActive: true,
          isSuperAdmin: true,
        },
      },
    );
  }

  /** Extra company ADMIN logins (can manage employees; Add Admin tab is super-admin only) */
  const COMPANY_ADMINS = [
    {
      email: 'ops.admin@arambh.demo',
      companyName: 'Arambh Ops Admin',
    },
    {
      email: 'club.admin@arambh.demo',
      companyName: 'Arambh Club Admin',
    },
  ];

  const companyAdmins = [];
  for (const def of COMPANY_ADMINS) {
    const existing = await CompanyMaster.findOne({ email: def.email }).select('_id').lean();
    const fields = {
      companyName: def.companyName,
      email: def.email,
      password: passwordHash,
      mobileNumber: '9999900001',
      gstNumber: '24ACQFS6351L2AI',
      countryId: country._id,
      stateId: state._id,
      cityId: city._id,
      address: 'Arambh Sports Arena, Vadodara',
      pincode: '390001',
      website: 'https://arambh.demo',
      isActive: true,
      isSuperAdmin: false,
    };
    if (existing?._id) {
      await CompanyMaster.collection.updateOne({ _id: existing._id }, { $set: fields });
    } else {
      await CompanyMaster.collection.insertOne({
        ...fields,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    companyAdmins.push(def.email);
  }

  logger.info(
    {
      count: created.length,
      password: DEMO_STAFF_PASSWORD,
      accounts: created.map((c) => `${c.email} (${c.role})`),
      admin: admin ? 'admin@demo.com (super ADMIN — can Add Admin)' : null,
      companyAdmins,
    },
    'seeded demo staff accounts',
  );

  return {
    accounts: created,
    password: DEMO_STAFF_PASSWORD,
    companyAdmins,
  };
}

export default seedStaff;
