import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255),
  parentId: z.string().optional(),
  color: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  folderId: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(['PROCESSING', 'READY', 'ERROR', 'DELETED']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'sizeBytes']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  favorites: z.coerce.boolean().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
