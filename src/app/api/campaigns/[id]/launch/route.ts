import { NextResponse } from 'next/server';
import { launchCampaign } from '@/lib/campaigns/launch';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await launchCampaign(id);
  if (!res.ok) return NextResponse.json({ error: res.message, code: res.code }, { status: 400 });
  return NextResponse.json({ ok: true, toSend: res.toSend, suppressed: res.suppressed });
}
