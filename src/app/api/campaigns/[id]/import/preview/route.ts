import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseCsv, type FieldKey } from '@/lib/csv/import';

export const runtime = 'nodejs';

const schema = z.object({
  content: z.string().min(1).max(10_000_000),
  mapping: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const camp = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!camp) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Archivo CSV inválido.' }, { status: 400 });

  const result = parseCsv(parsed.data.content, parsed.data.mapping as Partial<Record<FieldKey, string>>);
  return NextResponse.json({
    headers: result.headers,
    mapping: result.mapping,
    counts: {
      total: result.totalRows,
      valid: result.valid.length,
      invalid: result.errors.length,
      duplicates: result.duplicatesInFile,
    },
    sampleValid: result.valid.slice(0, 10),
    errors: result.errors.slice(0, 100),
  });
}
