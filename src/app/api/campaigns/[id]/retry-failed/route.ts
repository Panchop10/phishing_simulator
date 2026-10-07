import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { wakeWorker } from '@/lib/campaigns/worker';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 });
  if (c.status === 'DRAFT') {
    return NextResponse.json({ error: 'Lanza la campaña primero.' }, { status: 409 });
  }
  const res = await prisma.campaignRecipient.updateMany({
    where: { campaignId: id, status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: null, lockedAt: null, lastError: null },
  });
  if (res.count > 0 && c.status !== 'SENDING') {
    await prisma.campaign.update({ where: { id }, data: { status: 'SENDING', completedAt: null } });
  }
  wakeWorker();
  return NextResponse.json({ ok: true, retried: res.count });
}
