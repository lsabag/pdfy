import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  role: text('role', { enum: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] }).notNull().default('VIEWER'),
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  plan: text('plan').notNull().default('free'),
  storageUsedBytes: integer('storage_used_bytes').notNull().default(0),
  storageQuotaBytes: integer('storage_quota_bytes').notNull().default(53687091200), // 50GB
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  lastLoginAt: text('last_login_at'),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull().default('application/pdf'),
  sizeBytes: integer('size_bytes').notNull(),
  pageCount: integer('page_count').notNull().default(0),
  status: text('status', { enum: ['PROCESSING', 'READY', 'ERROR', 'DELETED'] }).notNull().default('PROCESSING'),
  storageKey: text('storage_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  metadata: text('metadata', { mode: 'json' }),
  isPasswordProtected: integer('is_password_protected', { mode: 'boolean' }).notNull().default(false),
  folderId: text('folder_id').references(() => folders.id),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  ownerId: text('owner_id').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
});

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  color: text('color'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type', { enum: ['TEXT', 'HIGHLIGHT', 'STICKY_NOTE', 'STAMP'] }).notNull().default('TEXT'),
  pageNumber: integer('page_number').notNull(),
  position: text('position', { mode: 'json' }).$type<{ x: number; y: number; width: number; height: number }>().notNull(),
  highlightColor: text('highlight_color'),
  documentId: text('document_id').notNull().references(() => documents.id),
  authorId: text('author_id').notNull().references(() => users.id),
  parentId: text('parent_id'),
  isResolved: integer('is_resolved', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const shares = sqliteTable('shares', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  createdById: text('created_by_id').notNull().references(() => users.id),
  recipientId: text('recipient_id').references(() => users.id),
  permission: text('permission', { enum: ['VIEW', 'COMMENT', 'EDIT'] }).notNull().default('VIEW'),
  token: text('token').notNull().unique(),
  password: text('password'),
  expiresAt: text('expires_at'),
  maxDownloads: integer('max_downloads'),
  downloadCount: integer('download_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const signatures = sqliteTable('signatures', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  signerId: text('signer_id').notNull().references(() => users.id),
  signatureData: text('signature_data').notNull(),
  pageNumber: integer('page_number').notNull(),
  position: text('position', { mode: 'json' }).$type<{ x: number; y: number; width: number; height: number }>().notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  signedAt: text('signed_at').notNull().default(sql`(datetime('now'))`),
});

// Saved signatures (permanent signatures the user can reuse)
export const savedSignatures = sqliteTable('saved_signatures', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), // e.g. "My signature", "Initials"
  type: text('type', { enum: ['DRAW', 'TYPE', 'IMAGE'] }).notNull().default('DRAW'),
  data: text('data').notNull(), // base64 PNG or SVG
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// Editable annotations (signatures, text) overlaid on documents
export const annotations = sqliteTable('annotations', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['SIGN', 'TEXT'] }).notNull(),
  pageNumber: integer('page_number').notNull(),
  x: real('x').notNull(),          // PDF points from left
  y: real('y').notNull(),          // PDF points from bottom
  width: real('width').notNull(),   // PDF points
  height: real('height').notNull(), // PDF points
  imageData: text('image_data').notNull(), // base64 PNG
  // For text type: store original text + settings for re-editing
  textContent: text('text_content'),
  textMeta: text('text_meta', { mode: 'json' }).$type<{ font: string; size: number; color: string }>(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Signature requests - send document for remote signing
export const signatureRequests = sqliteTable('signature_requests', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  requestedById: text('requested_by_id').notNull().references(() => users.id),
  signerName: text('signer_name').notNull(),
  signerEmail: text('signer_email').notNull(),
  token: text('token').notNull().unique(),
  status: text('status', { enum: ['PENDING', 'SIGNED', 'DECLINED', 'EXPIRED'] }).notNull().default('PENDING'),
  message: text('message'), // optional message to signer
  signedAt: text('signed_at'),
  signatureData: text('signature_data'), // base64 PNG of signature
  signaturePage: integer('signature_page'),
  signatureX: real('signature_x'),
  signatureY: real('signature_y'),
  signatureW: real('signature_w'),
  signatureH: real('signature_h'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  details: text('details', { mode: 'json' }),
  userId: text('user_id').notNull().references(() => users.id),
  documentId: text('document_id').references(() => documents.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }),
  userId: text('user_id').notNull().references(() => users.id),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// Key-value settings store
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const conversions = sqliteTable('conversions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id),
  format: text('format').notNull(),
  status: text('status', { enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] }).notNull().default('PENDING'),
  outputKey: text('output_key'),
  errorMessage: text('error_message'),
  requestedById: text('requested_by_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
});

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  role: text('role', { enum: ['ADMIN', 'EDITOR', 'VIEWER'] }).notNull().default('VIEWER'),
  token: text('token').notNull().unique(),
  invitedById: text('invited_by_id').notNull().references(() => users.id),
  acceptedAt: text('accepted_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
