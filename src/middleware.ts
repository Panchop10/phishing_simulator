import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'phishsim_session';

function key(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, key());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (await hasValidSession(req)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

// Protege solo el área de administración y sus APIs. Todo lo demás (rastreo,
// salud, autenticación, página de concientización) queda público.
export const config = {
  matcher: [
    '/',
    '/campaigns',
    '/campaigns/:path*',
    '/templates',
    '/templates/:path*',
    '/configuracion',
    '/configuracion/:path*',
    '/api/settings/:path*',
    '/api/templates/:path*',
    '/api/campaigns/:path*',
  ],
};
