import { NextResponse, type NextRequest } from 'next/server';
import { recordClick } from '@/lib/tracking';
import { clientIp } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    await recordClick(token, clientIp(req.headers), req.headers.get('user-agent'));
  } catch {
    // Registrar el clic nunca debe impedir mostrar la página educativa.
  }
  // Destino constante y controlado por el servidor: NO es un redirector abierto.
  const res = NextResponse.redirect(new URL('/concientizacion', req.nextUrl.origin), 302);
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
