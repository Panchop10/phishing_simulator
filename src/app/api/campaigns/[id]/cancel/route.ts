import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  if (c.status !== 'DRAFT' && c.status !== 'SENDING') {
    return NextResponse.json({ error: 'No se puede cancelar en su estado actual.' }, { status: 409 });
  }
  await prisma.campaign.update({ where: { id }, data: { status: 'CANCELLED', completedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
