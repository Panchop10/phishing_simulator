import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  templateId: z.string().min(1, 'Selecciona una plantilla'),
  fromName: z.string().trim().max(120).optional(),
  fromEmail: z.string().email().or(z.literal('')).optional(),
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
  const { name, templateId, fromName, fromEmail } = parsed.data;
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.archivedAt) {
    return NextResponse.json({ error: 'La plantilla seleccionada no existe.' }, { status: 400 });
  }
  const c = await prisma.campaign.create({
    data: {
      name,
      templateId,
      fromName: fromName || null,
      fromEmail: fromEmail || null,
    },
  });
  return NextResponse.json(c, { status: 201 });
}
