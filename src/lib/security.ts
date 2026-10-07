/** Extrae la IP del cliente desde las cabeceras de proxy habituales. */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return headers.get('x-real-ip');
}

/** Verifica que la petición de mutación venga del mismo origen (defensa CSRF). */
export function sameOrigin(req: Request, baseUrl?: string | null): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // navegaciones del mismo sitio pueden omitir Origin
  try {
    const o = new URL(origin);
    const host = req.headers.get('host');
    if (host && o.host === host) return true;
    if (baseUrl) {
      const b = new URL(baseUrl);
      if (o.host === b.host) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Normaliza la lista de dominios permitidos (separada por comas). */
export function parseAllowedDomains(csv?: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

/** ¿El correo pertenece a un dominio permitido? Lista vacía = permitir todos. */
export function isEmailAllowed(email: string, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const dom = email.slice(at + 1).toLowerCase();
  return domains.some((d) => dom === d || dom.endsWith('.' + d));
}

/** Heurística simple de bot/escáner para marcar aperturas/clics automáticos. */
export function looksLikeBot(userAgent: string | null, sentAt: Date | null, when: Date): boolean {
  if (sentAt && when.getTime() - sentAt.getTime() < 5000) return true;
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('googleimageproxy') ||
    ua.includes('yahoomailproxy') ||
    ua.includes('bot') ||
    ua.includes('crawler') ||
    ua.includes('proofpoint') ||
    ua.includes('mimecast') ||
    ua.includes('barracuda') ||
    ua.includes('microsoft office') ||
    ua.includes('curl') ||
    ua.includes('python-requests')
  );
}
