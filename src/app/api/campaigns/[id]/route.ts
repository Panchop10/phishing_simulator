import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  if (c.status === 'SENDING') {
    return NextResponse.json({ error: 'Cancela la campaña antes de eliminarla.' }, { status: 409 });
  }
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
