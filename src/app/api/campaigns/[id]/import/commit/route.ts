import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseCsv, type FieldKey } from '@/lib/csv/import';
import { generateToken } from '@/lib/tokens';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';

const schema = z.object({
  content: z.string().min(1).max(10_000_000),
  mapping: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const camp = await prisma.campaign.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!camp) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
  if (camp.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Solo se pueden importar destinatarios en una campaña en borrador.' },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Archivo CSV inválido.' }, { status: 400 });

  const result = parseCsv(parsed.data.content, parsed.data.mapping as Partial<Record<FieldKey, string>>);
  if (result.valid.length === 0) {
    return NextResponse.json({ error: 'No hay destinatarios válidos en el archivo.' }, { status: 400 });
  }

  const settings = await getSettings();
  const cap = settings.maxRecipientsPerCampaign;
  const existing = await prisma.campaignRecipient.findMany({
    where: { campaignId: id },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((e) => e.email));

  const toAdd: { campaignId: string; email: string; nombre: string | null; cargo: string | null; departamento: string | null; token: string }[] = [];
  let skippedExisting = 0;
  let capped = false;
  for (const r of result.valid) {
    if (existingSet.has(r.email)) {
      skippedExisting += 1;
      continue;
    }
    if (existing.length + toAdd.length >= cap) {
      capped = true;
      break;
    }
    toAdd.push({
      campaignId: id,
      email: r.email,
      nombre: r.nombre,
      cargo: r.cargo,
      departamento: r.departamento,
      token: generateToken(),
    });
  }

  if (toAdd.length) {
    await prisma.campaignRecipient.createMany({ data: toAdd, skipDuplicates: true });
  }

  return NextResponse.json({
    ok: true,
    created: toAdd.length,
    skippedExisting,
    invalid: result.errors.length,
    duplicatesInFile: result.duplicatesInFile,
    capped,
    cap,
  });
}
