import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { serverEnv } from './env';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'phishsim_session';
const ALG = 'HS256';

function sessionTtlHours(): number {
  const n = Number(process.env.SESSION_TTL_HOURS ?? 8);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(serverEnv().SESSION_SECRET);
}

/**
 * Marca la cookie como Secure solo cuando la plataforma se sirve por HTTPS, para
 * no romper el acceso por HTTP (p. ej. una EC2 sin proxy TLS). Forzable con
 * COOKIE_SECURE=true / COOKIE_INSECURE=true.
 */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_INSECURE === 'true') return false;
  return (process.env.APP_BASE_URL ?? '').startsWith('https://');
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export type SessionPayload = { sub: string; username: string };

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: ALG })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(`${sessionTtlHours()}h`)
    .sign(secretKey());
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: sessionTtlHours() * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { sub: String(payload.sub ?? ''), username: String((payload as Record<string, unknown>).username ?? '') };
  } catch {
    return null;
  }
}

// ---- administrador único + asistente de configuración inicial ----

export async function hasAdmin(): Promise<boolean> {
  return (await prisma.adminUser.count()) > 0;
}

export async function createAdmin(username: string, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.adminUser.create({ data: { username, passwordHash } });
}

export async function findAdmin(username: string) {
  return prisma.adminUser.findUnique({ where: { username } });
}

// ---- límite de intentos de inicio de sesión (en memoria) ----

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __loginBuckets?: Map<string, Bucket> };
const buckets = g.__loginBuckets ?? (g.__loginBuckets = new Map<string, Bucket>());
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function loginRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function resetLoginRateLimit(key: string): void {
  buckets.delete(key);
}
