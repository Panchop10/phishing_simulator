import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasAdmin, createAdmin, createSessionToken, setSessionCookie } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/settings';

export const runtime = 'nodejs';

const schema = z.object({
  username: z.string().trim().min(3, 'Mínimo 3 caracteres').max(60),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
  orgName: z.string().trim().max(120).optional(),
  appBaseUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

export async function POST(req: Request) {
  if (await hasAdmin()) {
    return NextResponse.json({ error: 'La cuenta de administrador ya existe.' }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { username, password, orgName, appBaseUrl } = parsed.data;
  await createAdmin(username, password);
  await getSettings();
  if (orgName || appBaseUrl) {
    await updateSettings({ orgName: orgName || null, appBaseUrl: appBaseUrl || null });
  }
  const token = await createSessionToken(username);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
