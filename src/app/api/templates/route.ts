import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hasLinkPlaceholder } from '@/lib/templating';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.template.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(items);
}

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  subject: z.string().trim().min(1, 'El asunto es obligatorio').max(300),
  bodyHtml: z.string().min(1, 'El cuerpo es obligatorio').max(100_000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (!hasLinkPlaceholder(parsed.data.bodyHtml)) {
    return NextResponse.json({ error: 'La plantilla debe incluir el marcador {{enlace}}.' }, { status: 400 });
  }
  const t = await prisma.template.create({ data: parsed.data });
  return NextResponse.json(t, { status: 201 });
}
