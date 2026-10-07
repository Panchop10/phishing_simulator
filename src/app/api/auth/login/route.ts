import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  findAdmin,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  loginRateLimit,
  resetLoginRateLimit,
} from '@/lib/auth';
import { clientIp } from '@/lib/security';

export const runtime = 'nodejs';

const schema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = clientIp(req.headers) ?? 'unknown';
  const rl = loginRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta nuevamente en ${rl.retryAfterSec} segundos.` },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 400 });
  }
  const { username, password } = parsed.data;
  const admin = await findAdmin(username);
  const ok = admin ? await verifyPassword(password, admin.passwordHash) : false;
  if (!admin || !ok) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
  }
  resetLoginRateLimit(ip);
  const token = await createSessionToken(username);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
