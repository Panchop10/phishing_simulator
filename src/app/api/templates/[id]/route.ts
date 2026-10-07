import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hasLinkPlaceholder } from '@/lib/templating';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t || t.archivedAt) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  return NextResponse.json(t);
}

const schema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().min(1).max(300).optional(),
  bodyHtml: z.string().min(1).max(100_000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) {
    return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.bodyHtml !== undefined && !hasLinkPlaceholder(parsed.data.bodyHtml)) {
    return NextResponse.json({ error: 'La plantilla debe incluir el marcador {{enlace}}.' }, { status: 400 });
  }
  const t = await prisma.template.update({ where: { id }, data: parsed.data });
  return NextResponse.json(t);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) {
    return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  }
  await prisma.template.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
