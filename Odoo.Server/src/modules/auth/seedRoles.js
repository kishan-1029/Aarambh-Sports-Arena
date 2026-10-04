/**
 * Seed Arambh demo roles (owner, manager, front_desk, pos_admin, ecom_admin, bar_staff, finance).
 * Tagged isDemo so --reset only removes demo rows.
 */
import { logger } from '../../lib/logger.js';
import { ROLE_PERMISSIONS } from './permissions.js';
import { ArambhRole } from './role.model.js';

const DEMO_ROLES = [
  { key: 'owner', name: 'Owner' },
  { key: 'manager', name: 'Club Manager' },
  { key: 'front_desk', name: 'Front Desk' },
  { key: 'pos_admin', name: 'POS Admin' },
  { key: 'ecom_admin', name: 'Ecom Admin' },
  { key: 'bar_staff', name: 'Bar Staff' },
  { key: 'finance', name: 'Finance' },
];

export async function seedArambhRoles() {
  for (const def of DEMO_ROLES) {
    const permissions = [...(ROLE_PERMISSIONS[def.key] || [])];
    await ArambhRole.findOneAndUpdate(
      { key: def.key },
      {
        key: def.key,
        name: def.name,
        permissions,
        isActive: true,
        isDemo: true,
      },
      { upsert: true, new: true },
    );
  }
  logger.info({ count: DEMO_ROLES.length }, 'seeded Arambh roles');
  return DEMO_ROLES.map((r) => r.key);
}

export async function resetArambhRoles() {
  const res = await ArambhRole.deleteMany({ isDemo: true });
  logger.info({ deleted: res.deletedCount }, 'demo Arambh roles reset');
  return res.deletedCount;
}

export { DEMO_ROLES };
