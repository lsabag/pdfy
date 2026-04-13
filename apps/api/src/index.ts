import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, isNull, isNotNull, like, sql } from 'drizzle-orm';
import * as schema from './db/schema.js';
import { hashPassword, verifyPassword, createToken, verifyToken, uid } from './lib/auth.js';
import type { Env, UserPayload } from './types.js';
import { PDFDocument, degrees } from 'pdf-lib';
import { nanoid } from 'nanoid';

type HonoEnv = { Bindings: Env; Variables: { user: UserPayload } };
const app = new Hono<HonoEnv>();

// CORS
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*',
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Helper: get DB
function db(c: any) {
  return drizzle(c.env.DB, { schema });
}

// Auth middleware
async function auth(c: any, next: any) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyToken(header.slice(7), c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Invalid token' }, 401);
  c.set('user', payload as UserPayload);
  return next();
}

// ═══════════════════════ HEALTH ═══════════════════════
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

// ═══════════════════════ AUTH ═══════════════════════
app.post('/api/auth/register', async (c) => {
  const { name, email, password } = await c.req.json();
  if (!name || !email || !password) return c.json({ error: 'Missing fields' }, 400);

  const d = db(c);
  const existing = await d.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (existing) return c.json({ error: { message: 'Email already registered' } }, 409);

  const allUsers = await d.select({ id: schema.users.id }).from(schema.users).limit(1).all();
  const role = allUsers.length === 0 ? 'OWNER' : 'VIEWER';
  const id = uid();
  const passwordHash = await hashPassword(password);

  await d.insert(schema.users).values({ id, email, name, passwordHash, role });
  const token = await createToken({ id, email, name, role }, c.env.JWT_SECRET);
  return c.json({ user: { id, email, name, role }, token }, 201);
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const d = db(c);
  const user = await d.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user || !user.isActive) return c.json({ error: { message: 'Invalid email or password' } }, 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ error: { message: 'Invalid email or password' } }, 401);

  await d.update(schema.users).set({ lastLoginAt: new Date().toISOString() }).where(eq(schema.users.id, user.id));
  const token = await createToken({ id: user.id, email: user.email, name: user.name, role: user.role }, c.env.JWT_SECRET);
  return c.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

app.get('/api/auth/me', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const u = await d.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
  if (!u) return c.json({ error: 'Not found' }, 404);
  const { passwordHash, ...safe } = u;
  return c.json(safe);
});

// ═══════════════════════ DOCUMENTS ═══════════════════════
app.post('/api/documents', auth, async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const folderId = formData.get('folderId') as string | null;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const id = uid();
  const storageKey = `documents/${user.id}/${id}/original.pdf`;
  const buffer = await file.arrayBuffer();

  await c.env.STORAGE.put(storageKey, buffer, { httpMetadata: { contentType: file.type } });

  // Get page count
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
  } catch {}

  const d = db(c);
  const doc = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ''),
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    pageCount,
    status: 'READY' as const,
    storageKey,
    ownerId: user.id,
    folderId: folderId || null,
    tags: [] as string[],
  };

  await d.insert(schema.documents).values(doc);
  await d.update(schema.users).set({
    storageUsedBytes: sql`${schema.users.storageUsedBytes} + ${file.size}`,
  }).where(eq(schema.users.id, user.id));

  return c.json(doc, 201);
});

app.get('/api/documents', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const { search, folderId, sortBy, sortOrder, favorites, status } = c.req.query();
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const conditions = [eq(schema.documents.ownerId, user.id)];

  if (status === 'DELETED') {
    conditions.push(isNotNull(schema.documents.deletedAt));
  } else {
    conditions.push(isNull(schema.documents.deletedAt));
  }

  if (folderId) conditions.push(eq(schema.documents.folderId, folderId));
  if (favorites === 'true') conditions.push(eq(schema.documents.isFavorite, true));
  if (search) conditions.push(like(schema.documents.name, `%${search}%`));

  const where = and(...conditions);
  const docs = await d.select().from(schema.documents)
    .where(where!)
    .orderBy(desc(schema.documents.updatedAt))
    .limit(limit).offset((page - 1) * limit)
    .all();

  const countResult = await d.select({ count: sql<number>`count(*)` })
    .from(schema.documents).where(where!).get();
  const total = countResult?.count || 0;

  return c.json({
    documents: docs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

app.get('/api/documents/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || (doc.ownerId !== user.id && doc.deletedAt)) return c.json({ error: 'Not found' }, 404);
  return c.json(doc);
});

app.get('/api/documents/:id/download', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.originalName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

app.patch('/api/documents/:id', auth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const updates: any = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.folderId !== undefined) updates.folderId = body.folderId;
  if (body.isFavorite !== undefined) updates.isFavorite = body.isFavorite;
  if (body.tags !== undefined) updates.tags = body.tags;

  await d.update(schema.documents).set(updates).where(eq(schema.documents.id, c.req.param('id')));
  return c.json({ ...doc, ...updates });
});

app.delete('/api/documents/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  await d.update(schema.documents).set({
    deletedAt: new Date().toISOString(),
    status: 'DELETED',
  }).where(eq(schema.documents.id, c.req.param('id')));

  return c.body(null, 204);
});

// ═══════════════════════ FOLDERS ═══════════════════════
app.post('/api/folders', auth, async (c) => {
  const user = c.get('user');
  const { name, parentId, color } = await c.req.json();
  const d = db(c);
  const id = uid();
  await d.insert(schema.folders).values({ id, name, parentId, ownerId: user.id, color });
  return c.json({ id, name, parentId, ownerId: user.id, color }, 201);
});

app.get('/api/folders', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const fldrs = await d.select().from(schema.folders).where(eq(schema.folders.ownerId, user.id)).orderBy(schema.folders.name).all();

  // Count docs per folder
  const result = [];
  for (const f of fldrs) {
    const cnt = await d.select({ count: sql<number>`count(*)` })
      .from(schema.documents)
      .where(and(eq(schema.documents.folderId, f.id), isNull(schema.documents.deletedAt)))
      .get();
    result.push({ ...f, documentCount: cnt?.count || 0 });
  }
  return c.json(result);
});

app.get('/api/folders/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const folder = await d.select().from(schema.folders).where(eq(schema.folders.id, c.req.param('id'))).get();
  if (!folder || folder.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const docs = await d.select().from(schema.documents)
    .where(and(eq(schema.documents.folderId, folder.id), isNull(schema.documents.deletedAt)))
    .orderBy(desc(schema.documents.updatedAt)).all();

  return c.json({ ...folder, documents: docs });
});

app.patch('/api/folders/:id', auth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const d = db(c);
  await d.update(schema.folders).set(body).where(
    and(eq(schema.folders.id, c.req.param('id')), eq(schema.folders.ownerId, user.id)),
  );
  return c.json({ success: true });
});

app.delete('/api/folders/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  // Move docs to root
  await d.update(schema.documents).set({ folderId: null }).where(eq(schema.documents.folderId, c.req.param('id')));
  await d.delete(schema.folders).where(
    and(eq(schema.folders.id, c.req.param('id')), eq(schema.folders.ownerId, user.id)),
  );
  return c.body(null, 204);
});

// ═══════════════════════ PDF OPS ═══════════════════════
app.post('/api/documents/:id/pages/reorder', auth, async (c) => {
  const user = c.get('user');
  const { pageOrder } = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);
  const pdfBuffer = await object.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const newPdf = await PDFDocument.create();
  for (const idx of pageOrder) {
    const [copied] = await newPdf.copyPages(pdfDoc, [idx]);
    newPdf.addPage(copied);
  }
  const newBuffer = await newPdf.save();
  const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
  await c.env.STORAGE.put(newKey, newBuffer, { httpMetadata: { contentType: 'application/pdf' } });

  await d.update(schema.documents).set({ storageKey: newKey, version: doc.version + 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.documents.id, doc.id));
  return c.json({ success: true });
});

app.post('/api/documents/:id/pages/rotate', auth, async (c) => {
  const user = c.get('user');
  const { pages } = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);
  const pdfDoc = await PDFDocument.load(await object.arrayBuffer());

  for (const { pageIndex, rotation } of pages) {
    const page = pdfDoc.getPage(pageIndex);
    page.setRotation(degrees(page.getRotation().angle + rotation));
  }
  const newBuffer = await pdfDoc.save();
  const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
  await c.env.STORAGE.put(newKey, newBuffer, { httpMetadata: { contentType: 'application/pdf' } });

  await d.update(schema.documents).set({ storageKey: newKey, version: doc.version + 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.documents.id, doc.id));
  return c.json({ success: true });
});

app.delete('/api/documents/:id/pages', auth, async (c) => {
  const user = c.get('user');
  const { pageIndices } = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);
  const pdfDoc = await PDFDocument.load(await object.arrayBuffer());

  for (const idx of [...pageIndices].sort((a: number, b: number) => b - a)) {
    pdfDoc.removePage(idx);
  }
  const newBuffer = await pdfDoc.save();
  const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
  await c.env.STORAGE.put(newKey, newBuffer, { httpMetadata: { contentType: 'application/pdf' } });

  await d.update(schema.documents).set({
    storageKey: newKey, pageCount: pdfDoc.getPageCount(),
    sizeBytes: newBuffer.byteLength, version: doc.version + 1, updatedAt: new Date().toISOString(),
  }).where(eq(schema.documents.id, doc.id));
  return c.json({ success: true, pageCount: pdfDoc.getPageCount() });
});

app.post('/api/documents/merge', auth, async (c) => {
  const user = c.get('user');
  const { documentIds, name } = await c.req.json();
  const d = db(c);
  const merged = await PDFDocument.create();

  for (const docId of documentIds) {
    const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, docId)).get();
    if (!doc || doc.ownerId !== user.id) continue;
    const object = await c.env.STORAGE.get(doc.storageKey);
    if (!object) continue;
    const source = await PDFDocument.load(await object.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }

  const buffer = await merged.save();
  const id = uid();
  const storageKey = `documents/${user.id}/${id}/original.pdf`;
  await c.env.STORAGE.put(storageKey, buffer, { httpMetadata: { contentType: 'application/pdf' } });

  const newDoc = {
    id, name: name || 'Merged Document', originalName: `${name || 'merged'}.pdf`,
    mimeType: 'application/pdf', sizeBytes: buffer.byteLength, pageCount: merged.getPageCount(),
    status: 'READY' as const, storageKey, ownerId: user.id, tags: [] as string[],
  };
  await d.insert(schema.documents).values(newDoc);
  return c.json(newDoc, 201);
});

app.post('/api/documents/:id/split', auth, async (c) => {
  const user = c.get('user');
  const { ranges } = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);
  const source = await PDFDocument.load(await object.arrayBuffer());
  const results = [];

  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const indices = Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i);
    const pages = await newPdf.copyPages(source, indices);
    for (const p of pages) newPdf.addPage(p);
    const buffer = await newPdf.save();
    const id = uid();
    const storageKey = `documents/${user.id}/${id}/original.pdf`;
    await c.env.STORAGE.put(storageKey, buffer, { httpMetadata: { contentType: 'application/pdf' } });
    const newDoc = {
      id, name: range.name, originalName: `${range.name}.pdf`, mimeType: 'application/pdf',
      sizeBytes: buffer.byteLength, pageCount: newPdf.getPageCount(),
      status: 'READY' as const, storageKey, ownerId: user.id, tags: [] as string[],
    };
    await d.insert(schema.documents).values(newDoc);
    results.push(newDoc);
  }
  return c.json(results, 201);
});

// Optimize/compress PDF
app.post('/api/documents/:id/optimize', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  const pdfDoc = await PDFDocument.load(await object.arrayBuffer());

  // Strip metadata to reduce size
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('pdfy');
  pdfDoc.setCreator('pdfy');

  // Re-save with object stream compression (pdf-lib does this by default)
  const optimizedBuffer = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 100,
  });

  const originalSize = doc.sizeBytes;
  const newSize = optimizedBuffer.byteLength;
  const saved = originalSize - newSize;

  if (saved > 0) {
    const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
    await c.env.STORAGE.put(newKey, optimizedBuffer, { httpMetadata: { contentType: 'application/pdf' } });

    await d.update(schema.documents).set({
      storageKey: newKey,
      sizeBytes: newSize,
      version: doc.version + 1,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.documents.id, doc.id));

    await d.update(schema.users).set({
      storageUsedBytes: sql`${schema.users.storageUsedBytes} - ${saved}`,
    }).where(eq(schema.users.id, user.id));
  }

  return c.json({
    originalSize,
    optimizedSize: newSize,
    savedBytes: Math.max(0, saved),
    savedPercent: saved > 0 ? Math.round((saved / originalSize) * 100) : 0,
  });
});

// ═══════════════════════ SHARING ═══════════════════════
app.post('/api/documents/:id/share', auth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Only owner can share' }, 403);

  const id = uid();
  const token = nanoid(21);
  const hashedPw = body.password ? await hashPassword(body.password) : null;

  await d.insert(schema.shares).values({
    id, documentId: doc.id, createdById: user.id,
    permission: body.permission || 'VIEW', token, password: hashedPw,
    expiresAt: body.expiresAt || null, maxDownloads: body.maxDownloads || null,
  });

  return c.json({ id, token, permission: body.permission || 'VIEW' }, 201);
});

app.get('/api/documents/:id/shares', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const shares = await d.select().from(schema.shares)
    .where(and(eq(schema.shares.documentId, c.req.param('id')), eq(schema.shares.createdById, user.id), eq(schema.shares.isActive, true)))
    .all();
  return c.json(shares);
});

app.delete('/api/shares/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  await d.update(schema.shares).set({ isActive: false })
    .where(and(eq(schema.shares.id, c.req.param('id')), eq(schema.shares.createdById, user.id)));
  return c.body(null, 204);
});

// Public share access
app.get('/api/share/:token', async (c) => {
  const d = db(c);
  const share = await d.select().from(schema.shares).where(eq(schema.shares.token, c.req.param('token'))).get();
  if (!share || !share.isActive) return c.json({ error: 'Link invalid' }, 404);
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return c.json({ error: 'Expired' }, 403);

  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, share.documentId)).get();
  const creator = await d.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, share.createdById)).get();

  return c.json({
    id: share.id, document: doc, createdBy: creator,
    permission: share.permission, hasPassword: !!share.password,
  });
});

app.post('/api/share/:token/verify', async (c) => {
  const { password } = await c.req.json();
  const d = db(c);
  const share = await d.select().from(schema.shares).where(eq(schema.shares.token, c.req.param('token'))).get();
  if (!share || !share.password) return c.json({ error: 'Not found' }, 404);
  const valid = await verifyPassword(password, share.password);
  if (!valid) return c.json({ error: { message: 'Incorrect password' } }, 401);
  return c.json({ verified: true });
});

app.get('/api/share/:token/download', async (c) => {
  const d = db(c);
  const share = await d.select().from(schema.shares).where(eq(schema.shares.token, c.req.param('token'))).get();
  if (!share || !share.isActive) return c.json({ error: 'Invalid' }, 404);

  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, share.documentId)).get();
  if (!doc) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  await d.update(schema.shares).set({ downloadCount: share.downloadCount + 1 }).where(eq(schema.shares.id, share.id));

  return new Response(object.body, {
    headers: { 'Content-Type': doc.mimeType, 'Content-Disposition': `inline; filename="${doc.originalName}"` },
  });
});

// ═══════════════════════ COMMENTS ═══════════════════════
app.post('/api/documents/:id/comments', auth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const d = db(c);
  const id = uid();
  await d.insert(schema.comments).values({
    id, documentId: c.req.param('id'), authorId: user.id,
    content: body.content, type: body.type || 'TEXT',
    pageNumber: body.pageNumber, position: body.position,
    highlightColor: body.highlightColor, parentId: body.parentId,
  });
  const comment = await d.select().from(schema.comments).where(eq(schema.comments.id, id)).get();
  return c.json(comment, 201);
});

app.get('/api/documents/:id/comments', auth, async (c) => {
  const d = db(c);
  const comments = await d.select().from(schema.comments)
    .where(eq(schema.comments.documentId, c.req.param('id')))
    .orderBy(schema.comments.createdAt).all();
  return c.json(comments);
});

app.patch('/api/comments/:id/resolve', auth, async (c) => {
  const d = db(c);
  const comment = await d.select().from(schema.comments).where(eq(schema.comments.id, c.req.param('id'))).get();
  if (!comment) return c.json({ error: 'Not found' }, 404);
  await d.update(schema.comments).set({ isResolved: !comment.isResolved }).where(eq(schema.comments.id, c.req.param('id')));
  return c.json({ success: true });
});

app.delete('/api/comments/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  await d.delete(schema.comments).where(and(eq(schema.comments.id, c.req.param('id')), eq(schema.comments.authorId, user.id)));
  return c.body(null, 204);
});

// ═══════════════════════ SIGNATURES ═══════════════════════
app.post('/api/documents/:id/sign', auth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const d = db(c);
  const id = uid();
  await d.insert(schema.signatures).values({
    id, documentId: c.req.param('id'), signerId: user.id,
    signatureData: body.signatureData, pageNumber: body.pageNumber,
    position: body.position, ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
    userAgent: c.req.header('User-Agent') || 'unknown',
  });
  return c.json({ id }, 201);
});

// ═══════════════════════ SAVED SIGNATURES ═══════════════════════
// List user's saved signatures
app.get('/api/signatures', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const sigs = await d.select().from(schema.savedSignatures)
    .where(eq(schema.savedSignatures.userId, user.id))
    .orderBy(desc(schema.savedSignatures.createdAt)).all();
  return c.json(sigs);
});

// Save a new signature (permanent)
app.post('/api/signatures', auth, async (c) => {
  const user = c.get('user');
  const { name, type, data: sigData, isDefault } = await c.req.json();
  if (!sigData) return c.json({ error: 'Signature data required' }, 400);
  const d = db(c);
  const id = uid();

  // If setting as default, unset previous default
  if (isDefault) {
    await d.update(schema.savedSignatures).set({ isDefault: false })
      .where(eq(schema.savedSignatures.userId, user.id));
  }

  await d.insert(schema.savedSignatures).values({
    id, userId: user.id, name: name || 'My Signature',
    type: type || 'DRAW', data: sigData, isDefault: isDefault || false,
  });
  return c.json({ id }, 201);
});

// Delete a saved signature
app.delete('/api/signatures/:id', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  await d.delete(schema.savedSignatures).where(
    and(eq(schema.savedSignatures.id, c.req.param('id')), eq(schema.savedSignatures.userId, user.id)),
  );
  return c.body(null, 204);
});

// Set a signature as default
app.patch('/api/signatures/:id/default', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  await d.update(schema.savedSignatures).set({ isDefault: false })
    .where(eq(schema.savedSignatures.userId, user.id));
  await d.update(schema.savedSignatures).set({ isDefault: true })
    .where(and(eq(schema.savedSignatures.id, c.req.param('id')), eq(schema.savedSignatures.userId, user.id)));
  return c.json({ success: true });
});

// Apply signature to a document (stamp it on a specific page/position)
app.post('/api/documents/:id/apply-signature', auth, async (c) => {
  const user = c.get('user');
  const { signatureData, pageNumber, x, y, width, height } = await c.req.json();
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  // Load the PDF
  const pdfDoc = await PDFDocument.load(await object.arrayBuffer());
  const pageCount = pdfDoc.getPageCount();
  const pageIdx = pageNumber - 1;
  if (pageIdx < 0 || pageIdx >= pageCount) return c.json({ error: 'Invalid page number' }, 400);

  // Extract the base64 PNG image from the signature data
  // signatureData is "data:image/png;base64,iVBOR..."
  let base64Data: string;
  if (signatureData.includes('base64,')) {
    base64Data = signatureData.split('base64,')[1];
  } else {
    base64Data = signatureData;
  }
  if (!base64Data) return c.json({ error: 'Invalid signature data' }, 400);

  // Decode base64 to bytes (Workers-compatible)
  const binaryString = atob(base64Data.replace(/\s/g, ''));
  const pngBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pngBytes[i] = binaryString.charCodeAt(i);
  }

  let pngImage;
  try {
    pngImage = await pdfDoc.embedPng(pngBytes);
  } catch (embedError) {
    return c.json({ error: 'Failed to embed signature image: ' + String(embedError) }, 400);
  }

  // Get the target page and its dimensions
  const page = pdfDoc.getPage(pageIdx);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Place the signature - x,y are percentages from top-left in the UI
  // pdf-lib uses bottom-left origin, so flip Y
  const sigWidth = width || 200;
  const sigHeight = height || 60;
  const sigX = x || 100;
  // Convert from top-origin Y to bottom-origin Y
  const sigY = pageHeight - (y || 100) - sigHeight;

  page.drawImage(pngImage, {
    x: sigX,
    y: sigY,
    width: sigWidth,
    height: sigHeight,
  });

  // Save the modified PDF
  const newBuffer = await pdfDoc.save();
  const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
  await c.env.STORAGE.put(newKey, newBuffer, { httpMetadata: { contentType: 'application/pdf' } });

  // Update document record
  await d.update(schema.documents).set({
    storageKey: newKey,
    sizeBytes: newBuffer.byteLength,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.documents.id, doc.id));

  // Record the signature placement
  const sigId = uid();
  await d.insert(schema.signatures).values({
    id: sigId, documentId: doc.id, signerId: user.id,
    signatureData, pageNumber,
    position: { x: sigX, y: sigY, width: sigWidth, height: sigHeight },
    ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
    userAgent: c.req.header('User-Agent') || 'unknown',
  });

  return c.json({ id: sigId, page: pageNumber, message: 'Signature stamped on PDF' }, 201);
});

// ═══════════════════════ FORM FILLING ═══════════════════════
// Get form fields from a PDF (detect fillable fields)
app.get('/api/documents/:id/form-fields', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  // Get stored form fields
  const fields = await d.select().from(schema.conversions)
    .where(and(eq(schema.conversions.documentId, doc.id), eq(schema.conversions.format, 'FORM_FIELDS')))
    .all();

  // Try to detect form fields from the PDF
  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  try {
    const pdfDoc = await PDFDocument.load(await object.arrayBuffer());
    const form = pdfDoc.getForm();
    const pdfFields = form.getFields().map((field) => ({
      name: field.getName(),
      type: field.constructor.name.replace('PDF', '').replace('Field', '').toLowerCase(),
    }));
    return c.json({ fields: pdfFields, count: pdfFields.length });
  } catch {
    return c.json({ fields: [], count: 0, message: 'No form fields detected' });
  }
});

// Fill form fields in a PDF
app.post('/api/documents/:id/fill-form', auth, async (c) => {
  const user = c.get('user');
  const { fields } = await c.req.json(); // { fieldName: value, ... }
  const d = db(c);
  const doc = await d.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).get();
  if (!doc || doc.ownerId !== user.id) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.STORAGE.get(doc.storageKey);
  if (!object) return c.json({ error: 'File not found' }, 404);

  try {
    const pdfDoc = await PDFDocument.load(await object.arrayBuffer());
    const form = pdfDoc.getForm();
    let filled = 0;

    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        const field = form.getField(fieldName);
        const typeName = field.constructor.name;
        if (typeName === 'PDFTextField') {
          (field as any).setText(value as string);
          filled++;
        } else if (typeName === 'PDFCheckBox') {
          if (value) (field as any).check(); else (field as any).uncheck();
          filled++;
        } else if (typeName === 'PDFDropdown') {
          (field as any).select(value as string);
          filled++;
        } else if (typeName === 'PDFRadioGroup') {
          (field as any).select(value as string);
          filled++;
        }
      } catch { /* skip fields that can't be filled */ }
    }

    const newBuffer = await pdfDoc.save();
    const newKey = `documents/${user.id}/${doc.id}/current.pdf`;
    await c.env.STORAGE.put(newKey, newBuffer, { httpMetadata: { contentType: 'application/pdf' } });

    await d.update(schema.documents).set({
      storageKey: newKey, sizeBytes: newBuffer.byteLength,
      version: doc.version + 1, updatedAt: new Date().toISOString(),
    }).where(eq(schema.documents.id, doc.id));

    return c.json({ filled, total: Object.keys(fields).length });
  } catch (error) {
    return c.json({ error: 'Failed to fill form: ' + String(error) }, 500);
  }
});

// ═══════════════════════ BULK ═══════════════════════
app.post('/api/bulk/move', auth, async (c) => {
  const user = c.get('user');
  const { documentIds, folderId } = await c.req.json();
  const d = db(c);
  for (const docId of documentIds) {
    await d.update(schema.documents).set({ folderId })
      .where(and(eq(schema.documents.id, docId), eq(schema.documents.ownerId, user.id)));
  }
  return c.json({ moved: documentIds.length });
});

app.post('/api/bulk/delete', auth, async (c) => {
  const user = c.get('user');
  const { documentIds } = await c.req.json();
  const d = db(c);
  for (const docId of documentIds) {
    await d.update(schema.documents).set({ deletedAt: new Date().toISOString(), status: 'DELETED' })
      .where(and(eq(schema.documents.id, docId), eq(schema.documents.ownerId, user.id)));
  }
  return c.json({ deleted: documentIds.length });
});

app.post('/api/bulk/restore', auth, async (c) => {
  const user = c.get('user');
  const { documentIds } = await c.req.json();
  const d = db(c);
  for (const docId of documentIds) {
    await d.update(schema.documents).set({ deletedAt: null, status: 'READY' })
      .where(and(eq(schema.documents.id, docId), eq(schema.documents.ownerId, user.id)));
  }
  return c.json({ restored: documentIds.length });
});

app.post('/api/bulk/permanent-delete', auth, async (c) => {
  const user = c.get('user');
  const { documentIds } = await c.req.json();
  const d = db(c);
  for (const docId of documentIds) {
    const doc = await d.select().from(schema.documents)
      .where(and(eq(schema.documents.id, docId), eq(schema.documents.ownerId, user.id), isNotNull(schema.documents.deletedAt)))
      .get();
    if (doc) {
      await c.env.STORAGE.delete(doc.storageKey);
      await d.delete(schema.documents).where(eq(schema.documents.id, docId));
    }
  }
  return c.json({ deleted: documentIds.length });
});

app.get('/api/trash', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const docs = await d.select().from(schema.documents)
    .where(and(eq(schema.documents.ownerId, user.id), isNotNull(schema.documents.deletedAt)))
    .orderBy(desc(schema.documents.deletedAt)).all();
  return c.json(docs);
});

// ═══════════════════════ ADMIN ═══════════════════════
app.get('/api/admin/users', auth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') return c.json({ error: 'Forbidden' }, 403);
  const d = db(c);
  const users = await d.select().from(schema.users).orderBy(desc(schema.users.createdAt)).all();
  return c.json({
    users: users.map(({ passwordHash, ...u }) => u),
    pagination: { page: 1, limit: 100, total: users.length, totalPages: 1 },
  });
});

app.patch('/api/admin/users/:id/role', auth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') return c.json({ error: 'Forbidden' }, 403);
  const { role } = await c.req.json();
  const d = db(c);
  await d.update(schema.users).set({ role }).where(eq(schema.users.id, c.req.param('id')));
  return c.json({ success: true });
});

app.patch('/api/admin/users/:id/toggle-active', auth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') return c.json({ error: 'Forbidden' }, 403);
  const d = db(c);
  const target = await d.select().from(schema.users).where(eq(schema.users.id, c.req.param('id'))).get();
  if (!target) return c.json({ error: 'Not found' }, 404);
  await d.update(schema.users).set({ isActive: !target.isActive }).where(eq(schema.users.id, c.req.param('id')));
  return c.json({ success: true });
});

app.post('/api/admin/invites', auth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') return c.json({ error: 'Forbidden' }, 403);
  const { email, role } = await c.req.json();
  const d = db(c);
  const id = uid();
  const token = nanoid(32);
  await d.insert(schema.invites).values({
    id, email, role: role || 'VIEWER', token, invitedById: user.id,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  return c.json({ id, token, email }, 201);
});

app.get('/api/admin/invites', auth, async (c) => {
  const d = db(c);
  const invs = await d.select().from(schema.invites).where(isNull(schema.invites.acceptedAt)).all();
  return c.json(invs);
});

// ═══════════════════════ NOTIFICATIONS ═══════════════════════
app.get('/api/notifications', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  const notifs = await d.select().from(schema.notifications)
    .where(eq(schema.notifications.userId, user.id))
    .orderBy(desc(schema.notifications.createdAt)).limit(20).all();
  const unread = await d.select({ count: sql<number>`count(*)` }).from(schema.notifications)
    .where(and(eq(schema.notifications.userId, user.id), eq(schema.notifications.isRead, false))).get();
  return c.json({ notifications: notifs, unreadCount: unread?.count || 0 });
});

app.post('/api/notifications/read-all', auth, async (c) => {
  const user = c.get('user');
  const d = db(c);
  await d.update(schema.notifications).set({ isRead: true })
    .where(and(eq(schema.notifications.userId, user.id), eq(schema.notifications.isRead, false)));
  return c.json({ success: true });
});

export default app;
