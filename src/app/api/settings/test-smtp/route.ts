import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, isSmtpConfigured } from '@/lib/settings';
import { buildTransport, fromHeader, sendOne, verifyTransport } from '@/lib/mailer';

export const runtime = 'nodejs';

const schema = z.object({ to: z.string().email('Correo de destino inválido') });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Indica un correo de destino válido.' }, { status: 400 });
  }
  const settings = await getSettings();
  if (!isSmtpConfigured(settings)) {
    return NextResponse.json(
      { error: 'Configura y guarda el servidor SMTP antes de probar.' },
      { status: 400 },
    );
  }

  try {
    await verifyTransport(settings);
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo conectar al servidor SMTP: ${e instanceof Error ? e.message : 'error desconocido'}` },
      { status: 502 },
    );
  }

  const tx = buildTransport(settings);
  try {
    await sendOne(tx, {
      to: parsed.data.to,
      from: fromHeader(settings),
      subject: 'Correo de prueba — Simulador de Phishing',
      html: `<p>Este es un correo de prueba del Simulador de Phishing${
        settings.orgName ? ` de ${settings.orgName}` : ''
      }.</p><p>Si lo recibes, la configuración SMTP funciona correctamente.</p>`,
      text: 'Correo de prueba del Simulador de Phishing. Si lo recibes, el SMTP funciona correctamente.',
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Conexión correcta, pero el envío falló: ${e instanceof Error ? e.message : 'error desconocido'}` },
      { status: 502 },
    );
  } finally {
    tx.close();
  }

  return NextResponse.json({ ok: true });
}
