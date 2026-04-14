import { safeCompare } from './security.js';

// Password hashing with PBKDF2 + per-password random salt
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Generate random salt for each password
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...salt));

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256,
  );
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // Store as salt:hash so we can verify later
  return `${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();

  // New format: salt:hash
  if (storedHash.includes(':')) {
    const [saltB64, expectedHash] = storedHash.split(':');
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
    );
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256,
    );
    const computed = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return safeCompare(computed, expectedHash);
  }

  // Legacy format: hash only (fixed salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode('pdfy-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256,
  );
  const computed = btoa(String.fromCharCode(...new Uint8Array(hash)));
  if (safeCompare(computed, storedHash)) return true;

  // Fallback: very old SHA-256 loop hashes
  const data = encoder.encode(password + 'pdfy-salt-v1');
  let result = await crypto.subtle.digest('SHA-256', data);
  for (let i = 0; i < 100; i++) {
    result = await crypto.subtle.digest('SHA-256', result);
  }
  const oldHash = btoa(String.fromCharCode(...new Uint8Array(result)));
  return safeCompare(oldHash, storedHash);
}

export async function createToken(
  payload: Record<string, any>,
  secret: string,
  expiresInHours = 168, // 7 days
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInHours * 3600 };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const bodyB64 = btoa(JSON.stringify(body)).replace(/=/g, '');
  const message = `${headerB64}.${bodyB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');

  return `${message}.${sigB64}`;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigB64] = parts;
    const message = `${headerB64}.${bodyB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Restore base64 padding
    const pad = (s: string) => s + '='.repeat((4 - (s.length % 4)) % 4);
    const sigBytes = Uint8Array.from(atob(pad(sigB64)), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(message));
    if (!valid) return null;

    const body = JSON.parse(atob(pad(bodyB64)));
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;

    return body;
  } catch {
    return null;
  }
}

export function uid(): string {
  return crypto.randomUUID();
}
