const ALLOWED_VARS = ['nombre', 'email', 'cargo', 'departamento'] as const;
type AllowedVar = (typeof ALLOWED_VARS)[number];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type RecipientVars = {
  nombre?: string | null;
  email: string;
  cargo?: string | null;
  departamento?: string | null;
};

/** ¿La plantilla incluye el marcador obligatorio {{enlace}}? */
export function hasLinkPlaceholder(html: string): boolean {
  return /\{\{\s*enlace\s*\}\}/i.test(html);
}

/** Marcadores no reconocidos (para advertir en la vista previa). */
export function unknownPlaceholders(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = m[1].toLowerCase();
    if (key === 'enlace' || key === 'pixel') continue;
    if (!(ALLOWED_VARS as readonly string[]).includes(key)) found.add(key);
  }
  return [...found];
}

function pixelTag(url: string): string {
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;max-height:0;overflow:hidden" />`;
}

export type RenderResult = { html: string; text: string };

/** Rellena marcadores (escapando valores), inyecta el enlace de clic y el pixel de apertura. */
export function renderEmail(opts: {
  bodyHtml: string;
  vars: RecipientVars;
  clickUrl: string;
  openPixelUrl: string;
}): RenderResult {
  const { bodyHtml, vars, clickUrl, openPixelUrl } = opts;
  const values: Record<AllowedVar, string> = {
    nombre: vars.nombre ?? '',
    email: vars.email ?? '',
    cargo: vars.cargo ?? '',
    departamento: vars.departamento ?? '',
  };

  let html = bodyHtml.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (full, rawKey) => {
    const key = String(rawKey).toLowerCase();
    if (key === 'enlace') return clickUrl;
    if (key === 'pixel') return pixelTag(openPixelUrl);
    if (key in values) return escapeHtml(values[key as AllowedVar]);
    return full;
  });

  // Inyectar el pixel si no se colocó manualmente con {{pixel}}.
  if (!html.includes(openPixelUrl)) {
    const pixel = pixelTag(openPixelUrl);
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${pixel}</body>`) : html + pixel;
  }

  return { html, text: htmlToText(html, clickUrl) };
}

function htmlToText(html: string, clickUrl: string): string {
  let t = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (clickUrl && !t.includes(clickUrl)) t += `\n\n${clickUrl}`;
  return t;
}

/** Vista previa con datos de ejemplo (uso en el editor, cliente o servidor). */
export function renderPreview(bodyHtml: string): string {
  return renderEmail({
    bodyHtml,
    vars: { nombre: 'Ana Pérez', email: 'ana.perez@empresa.cl', cargo: 'Analista', departamento: 'Finanzas' },
    clickUrl: '#enlace-de-simulacion',
    openPixelUrl: 'about:blank#pixel',
  }).html;
}
