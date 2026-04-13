export type SharePermission = 'VIEW' | 'COMMENT' | 'EDIT';

export interface Share {
  id: string;
  documentId: string;
  createdById: string;
  recipientId?: string;
  permission: SharePermission;
  token: string;
  password?: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}
