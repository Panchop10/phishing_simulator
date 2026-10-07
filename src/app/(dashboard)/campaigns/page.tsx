import Link from 'next/link';
import { Plus, Megaphone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { campaignStatusLabel } from '@/lib/campaigns/state';
import { formatDateTime } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

const statusTone = { DRAFT: 'muted', SENDING: 'warning', SENT: 'success', CANCELLED: 'muted' } as const;

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { template: { select: { name: true } } },
  });
  const counts = await prisma.$queryRaw<
    { campaignId: string; total: bigint; sent: bigint; opened: bigint; clicked: bigint }[]
  >`SELECT "campaignId", count(*) AS total, count("sentAt") AS sent,
      count("firstOpenedAt") AS opened, count("firstClickedAt") AS clicked
    FROM "CampaignRecipient" GROUP BY "campaignId"`;
  const map = new Map(
    counts.map((c) => [
      c.campaignId,
      { total: Number(c.total), sent: Number(c.sent), opened: Number(c.opened), clicked: Number(c.clicked) },
    ]),
  );

  return (
    <div>
      <PageHeader title="Campañas" description="Simulaciones de phishing y sus resultados.">
        <Link href="/campaigns/new">
          <Button><Plus className="h-4 w-4" />Nueva campaña</Button>
        </Link>
      </PageHeader>

      {campaigns.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Megaphone className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Aún no hay campañas. Crea la primera para empezar a medir.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">Campaña</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Destinatarios</th>
                <th className="p-4 font-medium">Aperturas</th>
                <th className="p-4 font-medium">Clics</th>
                <th className="p-4 font-medium">Creada</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const m = map.get(c.id) ?? { total: 0, sent: 0, opened: 0, clicked: 0 };
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="p-4">
                      <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      <div className="text-xs text-muted-foreground">{c.template?.name ?? 'Sin plantilla'}</div>
                    </td>
                    <td className="p-4"><Badge variant={statusTone[c.status]}>{campaignStatusLabel[c.status]}</Badge></td>
                    <td className="p-4 text-muted-foreground">{m.total}</td>
                    <td className="p-4 text-muted-foreground">{m.opened}{m.sent ? ` (${Math.round((m.opened / m.sent) * 100)}%)` : ''}</td>
                    <td className="p-4 text-muted-foreground">{m.clicked}{m.sent ? ` (${Math.round((m.clicked / m.sent) * 100)}%)` : ''}</td>
                    <td className="p-4 text-muted-foreground">{formatDateTime(c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
