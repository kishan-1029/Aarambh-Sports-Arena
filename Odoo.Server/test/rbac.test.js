import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import session from 'express-session';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import {
  requirePermission,
  requireAllPermissions,
} from '../src/modules/auth/rbac.middleware.js';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  permissionsForRole,
  hasAnyPermission,
  resolveArambhRoleKey,
} from '../src/modules/auth/permissions.js';
import { seedArambhRoles } from '../src/modules/auth/seedRoles.js';
import { ArambhRole } from '../src/modules/auth/role.model.js';
import { attachStringPermissions } from '../src/modules/auth/sessionPermissions.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

/**
 * Minimal app: inject session.user via header X-Test-Role / X-Test-Perms
 * then hit a gated route.
 */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    }),
  );
  app.use((req, _res, next) => {
    const role = req.headers['x-test-role'];
    if (role) {
      const permsHeader = req.headers['x-test-perms'];
      const stringPermissions = permsHeader
        ? String(permsHeader).split(',').filter(Boolean)
        : [];
      req.session.user = {
        id: 'test-user',
        role: String(role),
        email: 'test@arambh.test',
        name: 'Test',
        stringPermissions,
      };
    }
    next();
  });

  app.get(
    '/arambh/bookings',
    requirePermission('booking.create'),
    (_req, res) => res.status(200).json({ isOk: true, status: 200 }),
  );
  app.get(
    '/arambh/audit-export',
    requireAllPermissions('audit.view', 'audit.export'),
    (_req, res) => res.status(200).json({ isOk: true, status: 200 }),
  );
  app.get(
    '/arambh/invoices',
    requirePermission('invoice.manage', 'invoice.view'),
    (_req, res) => res.status(200).json({ isOk: true, status: 200 }),
  );
  app.use(errorHandler);
  return app;
}

describe('permissions helpers', () => {
  test('owner has all PERMISSIONS', () => {
    expect(permissionsForRole('owner').length).toBe(PERMISSIONS.length);
  });

  test('resolveArambhRoleKey aliases', () => {
    expect(resolveArambhRoleKey('Front Desk')).toBe('front_desk');
    expect(resolveArambhRoleKey('Accountant')).toBe('finance');
    expect(resolveArambhRoleKey('unknown-xyz')).toBe(null);
  });

  test.each([
    ['manager', 'booking.create', true],
    ['manager', 'mcp.manage', false],
    ['front_desk', 'booking.create', true],
    ['front_desk', 'invoice.manage', false],
    ['bar_staff', 'pos.create', true],
    ['bar_staff', 'booking.create', false],
    ['finance', 'invoice.manage', true],
    ['finance', 'booking.create', false],
    ['owner', 'mcp.manage', true],
  ])('role %s perm %s → %s', (role, perm, expected) => {
    const have = ROLE_PERMISSIONS[role];
    expect(hasAnyPermission(have, [perm])).toBe(expected);
  });
});

describe('requirePermission middleware', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test.each([
    // [role, perms csv, path, expectedStatus]
    ['ADMIN', '', '/arambh/bookings', 200],
    ['EMPLOYEE', 'booking.create', '/arambh/bookings', 200],
    ['EMPLOYEE', 'booking.view', '/arambh/bookings', 403],
    ['EMPLOYEE', 'invoice.view', '/arambh/invoices', 200],
    ['EMPLOYEE', 'booking.view', '/arambh/invoices', 403],
  ])('%s with [%s] on %s → %i', async (role, perms, path, status) => {
    const app = buildApp();
    const res = await request(app)
      .get(path)
      .set('X-Test-Role', role)
      .set('X-Test-Perms', perms);
    expect(res.status).toBe(status);
    if (status === 200) expect(res.body.isOk).toBe(true);
    if (status === 403) expect(res.body.isOk).toBe(false);
  });

  test('unauthenticated → 401', async () => {
    const app = buildApp();
    const res = await request(app).get('/arambh/bookings');
    expect(res.status).toBe(401);
    expect(res.body.isOk).toBe(false);
  });

  test('requireAllPermissions needs every perm', async () => {
    const app = buildApp();
    const deny = await request(app)
      .get('/arambh/audit-export')
      .set('X-Test-Role', 'EMPLOYEE')
      .set('X-Test-Perms', 'audit.view');
    expect(deny.status).toBe(403);

    const allow = await request(app)
      .get('/arambh/audit-export')
      .set('X-Test-Role', 'EMPLOYEE')
      .set('X-Test-Perms', 'audit.view,audit.export');
    expect(allow.status).toBe(200);
  });
});

describe('seed roles + session attach', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('seedArambhRoles upserts 5 demo roles', async () => {
    await seedArambhRoles();
    const count = await ArambhRole.countDocuments({ isDemo: true });
    expect(count).toBe(5);
    const fd = await ArambhRole.findOne({ key: 'front_desk' }).lean();
    expect(fd.permissions).toContain('booking.create');
    expect(fd.permissions).not.toContain('mcp.manage');
  });

  test('ADMIN session gets all string permissions', async () => {
    const user = { role: 'ADMIN', id: '1' };
    await attachStringPermissions(user);
    expect(user.stringPermissions.length).toBe(PERMISSIONS.length);
    expect(user.arambhRoleKey).toBe('owner');
  });

  test('EMPLOYEE maps roleName Front Desk → front_desk perms', async () => {
    await seedArambhRoles();
    const user = { role: 'EMPLOYEE', id: '2', roleId: null };
    await attachStringPermissions(user, { roleName: 'Front Desk' });
    expect(user.arambhRoleKey).toBe('front_desk');
    expect(user.stringPermissions).toContain('booking.create');
    expect(user.stringPermissions).not.toContain('settings.manage');
  });
});
