import { prisma } from '@/lib/prisma';
import { buildRecipientsCsv } from '@/lib/csv/export';

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
  const c = await prisma.campaign.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!c) return new Response('No encontrada', { status: 404 });
  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: 'asc' },
  });
  const csv = buildRecipientsCsv(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="informe-${slug(c.name)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
