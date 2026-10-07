import { prisma } from '@/lib/prisma';
import { getCampaignMetrics } from '@/lib/metrics';
import { renderCampaignPdf } from '@/lib/reports/pdf';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 50) || 'informe'
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) return new Response('No encontrada', { status: 404 });
  const [metrics, settings] = await Promise.all([getCampaignMetrics(id), getSettings()]);
  const pdf = await renderCampaignPdf({
    campaignName: c.name,
    orgName: settings.orgName,
    launchedAt: c.launchedAt,
    completedAt: c.completedAt,
    generatedAt: new Date(),
    metrics,
  });
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe-${slug(c.name)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
