import { prisma } from './prisma';

export type CampaignMetrics = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  suppressed: number;
  pending: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  totalOpens: number;
  totalClicks: number;
};

/** Métricas de resumen de una campaña (conteos únicos por marca de tiempo). */
export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  const [total, sent, opened, clicked, failed, suppressed, pending] = await prisma.$transaction([
    prisma.campaignRecipient.count({ where: { campaignId } }),
    prisma.campaignRecipient.count({ where: { campaignId, sentAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, firstOpenedAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, firstClickedAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'FAILED' } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'SUPPRESSED' } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: { in: ['PENDING', 'SENDING'] } } }),
  ]);

  const eventAgg = await prisma.trackingEvent.groupBy({
    by: ['type'],
    where: { campaignId },
    _count: { _all: true },
  });
  const totalOpens = eventAgg.find((e) => e.type === 'OPEN')?._count._all ?? 0;
  const totalClicks = eventAgg.find((e) => e.type === 'CLICK')?._count._all ?? 0;

  return {
    total,
    sent,
    opened,
    clicked,
    failed,
    suppressed,
    pending,
    openRate: sent ? opened / sent : 0,
    clickRate: sent ? clicked / sent : 0,
    clickToOpenRate: opened ? clicked / opened : 0,
    totalOpens,
    totalClicks,
  };
}

export type TimelinePoint = { bucket: string; opens: number; clicks: number };

/** Serie temporal (por hora) de aperturas y clics, para el gráfico del panel. */
export async function getCampaignTimeline(campaignId: string): Promise<TimelinePoint[]> {
  const rows = await prisma.$queryRaw<{ bucket: Date; type: string; n: bigint }[]>`
    SELECT date_trunc('hour', "occurredAt") AS bucket, "type", count(*) AS n
    FROM "TrackingEvent"
    WHERE "campaignId" = ${campaignId}
    GROUP BY bucket, "type"
    ORDER BY bucket ASC`;
  const map = new Map<string, TimelinePoint>();
  for (const r of rows) {
    const key = r.bucket.toISOString();
    const p = map.get(key) ?? { bucket: key, opens: 0, clicks: 0 };
    if (r.type === 'OPEN') p.opens = Number(r.n);
    else if (r.type === 'CLICK') p.clicks = Number(r.n);
    map.set(key, p);
  }
  return [...map.values()];
}
