import type { UserRole } from '../types/user';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: ['*'],
  ADMIN: [
    'documents:read',
    'documents:write',
    'documents:delete',
    'documents:share',
    'users:read',
    'users:write',
    'users:invite',
    'admin:activity',
    'admin:settings',
  ],
  EDITOR: [
    'documents:read',
    'documents:write',
    'documents:share',
  ],
  VIEWER: [
    'documents:read',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes('*') || perms.includes(permission);
}

export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
