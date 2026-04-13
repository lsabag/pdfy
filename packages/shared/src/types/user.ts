export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  plan: string;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
}
