import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { startMemoryMongo, stopMemoryMongo, clearCollections } from './helpers/memoryMongo.js';
import MenuGroupMaster from '../models/MenuGroupMaster.js';
import MenuMaster from '../models/MenuMaster.js';
import { attachStringPermissions } from '../src/modules/auth/sessionPermissions.js';
import {
  employeeRouteAllowed,
  isAssignedNavVisible,
  permissionsForMenuFlags,
} from '../../packages/shared/menuGrantPermissions.js';

describe('assigned menu modules stay visible', () => {
  test('a checked Courts module shows even when the role name grants nothing', () => {
    const granted = new Set(['/courts']);
    expect(
      isAssignedNavVisible({
        url: '/courts',
        perm: 'court.view',
        grantedUrls: granted,
        hasStringPerm: false,
        allowWithoutGrant: false,
      }),
    ).toBe(true);
    expect(permissionsForMenuFlags('/courts', { read: true })).toContain('court.view');
  });

  test('an unchecked module stays hidden when the role template does not include it', () => {
    expect(
      isAssignedNavVisible({
        url: '/courts',
        perm: 'court.view',
        grantedUrls: new Set(),
        hasStringPerm: false,
        allowWithoutGrant: false,
      }),
    ).toBe(false);
  });

  test('a role-name template does not reveal a module that was not checked', () => {
    expect(
      isAssignedNavVisible({
        url: '/members',
        perm: 'member.view',
        grantedUrls: new Set(['/courts']),
        hasStringPerm: true,
        allowWithoutGrant: true,
      }),
    ).toBe(false);
  });

  test('Setup stays hidden unless that menu was checked', () => {
    expect(
      isAssignedNavVisible({
        url: '/department',
        grantedUrls: new Set(['/employee']),
        allowWithoutGrant: true,
      }),
    ).toBe(false);
    expect(
      isAssignedNavVisible({
        url: '/department',
        grantedUrls: new Set(['/department']),
      }),
    ).toBe(true);
  });

  test('typing an unassigned address does not open that screen', () => {
    const granted = new Set(['/courts', '/members']);
    expect(employeeRouteAllowed('/courts', granted)).toBe(true);
    expect(employeeRouteAllowed('/members/abc', granted)).toBe(true);
    expect(employeeRouteAllowed('/dashboard', granted)).toBe(true);
    expect(employeeRouteAllowed('/courts/bookings', granted)).toBe(false);
    expect(employeeRouteAllowed('/pos', granted)).toBe(false);
    expect(employeeRouteAllowed('/department', granted)).toBe(false);
  });

  test('edit on Courts also unlocks court.manage; read alone does not', () => {
    expect(permissionsForMenuFlags('/courts', { read: true })).not.toContain('court.manage');
    expect(permissionsForMenuFlags('/courts', { edit: true })).toEqual(
      expect.arrayContaining(['court.view', 'court.manage']),
    );
  });
});

describe('session string permissions include assigned menus', () => {
  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);

  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  test('custom role with Courts read receives court.view and keeps template perms off', async () => {
    const group = await MenuGroupMaster.create({
      menuGroupName: 'Front Desk & Courts',
      sequence: 1,
      isActive: true,
    });
    const menu = await MenuMaster.create({
      menuName: 'Courts',
      menuGroup: group._id,
      menuUrl: '/courts',
      sequence: 1,
      isActive: true,
    });

    const user = {
      role: 'EMPLOYEE',
      id: new mongoose.Types.ObjectId().toString(),
      roleId: null,
      permissions: [
        {
          menuId: menu._id.toString(),
          read: true,
          write: false,
          edit: false,
          delete: false,
          print: false,
          mail: false,
        },
      ],
    };

    await attachStringPermissions(user, { roleName: 'Custom Staff' });
    expect(user.arambhRoleKey).toBe(null);
    expect(user.stringPermissions).toContain('court.view');
    expect(user.stringPermissions).not.toContain('settings.manage');
    expect(user.stringPermissions).not.toContain('court.manage');
  });
});
