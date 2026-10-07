import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, AlertTriangle, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCampaignMetrics, getCampaignTimeline } from '@/lib/metrics';
import { getSettings, isSmtpConfigured, effectiveBaseUrl } from '@/lib/settings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { Funnel } from '@/components/dashboard/funnel';
import { TimelineChart } from '@/components/dashboard/timeline-chart';
import { CsvImporter } from '@/components/campaigns/csv-importer';
import { CampaignActions } from '@/components/campaigns/campaign-actions';
import { RecipientsTable, type RecipientRow } from '@/components/campaigns/recipients-table';
import { campaignStatusLabel } from '@/lib/campaigns/state';
import { formatDateTime } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
const statusTone = { DRAFT: 'muted', SENDING: 'warning', SENT: 'success', CANCELLED: 'muted' } as const;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const linkBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { template: { select: { name: true } } },
  });
  if (!campaign) notFound();

  const [metrics, timeline, settings, recipients] = await Promise.all([
    getCampaignMetrics(id),
    getCampaignTimeline(id),
    getSettings(),
    prisma.campaignRecipient.findMany({ where: { campaignId: id }, orderBy: { createdAt: 'asc' }, take: 2000 }),
  ]);

  const rows: RecipientRow[] = recipients.map((r) => ({
    id: r.id,
    email: r.email,
    nombre: r.nombre,
    cargo: r.cargo,
    departamento: r.departamento,
    status: r.status,
    sentAt: r.sentAt?.toISOString() ?? null,
    firstOpenedAt: r.firstOpenedAt?.toISOString() ?? null,
    firstClickedAt: r.firstClickedAt?.toISOString() ?? null,
    openCount: r.openCount,
    clickCount: r.clickCount,
    lastError: r.lastError,
  }));

  const isDraft = campaign.status === 'DRAFT';
  const smtpReady = isSmtpConfigured(settings) && !!effectiveBaseUrl(settings);

  return (
    <div className="space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver a campañas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
            <Badge variant={statusTone[campaign.status]}>{campaignStatusLabel[campaign.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Plantilla: {campaign.template?.name ?? '—'} · Lanzada: {formatDateTime(campaign.launchedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {metrics.total > 0 ? (
            <>
              <a className={linkBtn} href={`/api/campaigns/${id}/report/pdf`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />PDF
              </a>
              <a className={linkBtn} href={`/api/campaigns/${id}/report/csv`}>
                <Download className="h-4 w-4" />CSV
              </a>
            </>
          ) : null}
          <CampaignActions
            id={id}
            status={campaign.status}
            recipientCount={metrics.total}
            failedCount={metrics.failed}
          />
        </div>
      </div>

      {isDraft ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Destinatarios ({metrics.total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!smtpReady ? (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" />
                <span>
                  Antes de lanzar, configura el SMTP y la URL pública en{' '}
                  <Link href="/configuracion" className="text-primary font-medium">Configuración</Link>.
                </span>
              </div>
            ) : null}
            <CsvImporter campaignId={id} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Destinatarios" value={metrics.total} tone="primary" hint={`${metrics.pending} pendientes`} />
        <StatCard label="Enviados" value={metrics.sent} />
        <StatCard label="Aperturas" value={metrics.opened} tone="warn" hint={`${pct(metrics.openRate)} de enviados`} />
        <StatCard label="Clics" value={metrics.clicked} tone="danger" hint={`${pct(metrics.clickRate)} de enviados`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Embudo</CardTitle></CardHeader>
          <CardContent>
            <Funnel sent={metrics.sent} opened={metrics.opened} clicked={metrics.clicked} total={metrics.total} />
            {metrics.failed > 0 || metrics.suppressed > 0 ? (
              <p className="text-xs text-muted-foreground mt-4">
                {metrics.failed} fallidos · {metrics.suppressed} suprimidos (fuera de dominios permitidos)
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Actividad en el tiempo</CardTitle></CardHeader>
          <CardContent><TimelineChart data={timeline} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Destinatarios</CardTitle></CardHeader>
        <CardContent>
          <RecipientsTable rows={rows} />
          {metrics.total > rows.length ? (
            <p className="text-xs text-muted-foreground mt-3">
              Mostrando los primeros {rows.length} de {metrics.total}. Descarga el CSV para ver todos.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Las aperturas son referenciales: algunos clientes de correo y proxies (Apple Mail, Gmail, pasarelas de
        seguridad) pueden inflarlas o bloquearlas. El clic es el indicador más confiable. No se capturan credenciales.
      </p>
    </div>
  );
}
