import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { CampaignMetrics } from '../metrics';
import { formatDateTime } from '../datetime';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const C = {
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  warn: '#f59e0b',
  danger: '#dc2626',
  track: '#eff2f7',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: C.ink, fontFamily: 'Helvetica' },
  org: { fontSize: 10, color: C.muted, marginBottom: 2 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  sub: { fontSize: 11, color: C.muted, marginBottom: 16 },
  row: { flexDirection: 'row', marginHorizontal: -6 },
  card: {
    flex: 1,
    marginHorizontal: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  cardLabel: { fontSize: 9, color: C.muted, marginBottom: 4, textTransform: 'uppercase' },
  cardValue: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  cardHint: { fontSize: 9, color: C.muted, marginTop: 2 },
  section: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 24, marginBottom: 10 },
  barRow: { marginBottom: 12 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  barTrack: { height: 14, backgroundColor: C.track, borderRadius: 4 },
  barFill: { height: 14, borderRadius: 4 },
  meta: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  metaItem: { width: '50%', marginBottom: 4, fontSize: 10, color: C.muted },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: C.muted,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
});

type ReportArgs = {
  campaignName: string;
  orgName: string | null;
  launchedAt: Date | null;
  completedAt: Date | null;
  generatedAt: Date;
  metrics: CampaignMetrics;
};

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const ratio = total > 0 ? value / total : 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabel}>
        <Text>{label}</Text>
        <Text style={{ color: C.muted }}>
          {value} / {total} ({pct(ratio)})
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(ratio * 100, 1)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Report(a: ReportArgs) {
  const m = a.metrics;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.org}>{a.orgName ?? 'Simulación de phishing'}</Text>
        <Text style={styles.title}>Informe de campaña</Text>
        <Text style={styles.sub}>{a.campaignName}</Text>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Enviados</Text>
            <Text style={styles.cardValue}>{m.sent}</Text>
            <Text style={styles.cardHint}>de {m.total} destinatarios</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Aperturas</Text>
            <Text style={[styles.cardValue, { color: C.warn }]}>{m.opened}</Text>
            <Text style={styles.cardHint}>{pct(m.openRate)} de los enviados</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Clics</Text>
            <Text style={[styles.cardValue, { color: C.danger }]}>{m.clicked}</Text>
            <Text style={styles.cardHint}>{pct(m.clickRate)} de los enviados</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Fallidos</Text>
            <Text style={styles.cardValue}>{m.failed}</Text>
            <Text style={styles.cardHint}>{m.suppressed} suprimidos</Text>
          </View>
        </View>

        <Text style={styles.section}>Embudo de la simulación</Text>
        <Bar label="Enviados" value={m.sent} total={m.total || 1} color={C.primary} />
        <Bar label="Abrieron el correo" value={m.opened} total={m.sent || 1} color={C.warn} />
        <Bar label="Hicieron clic en el enlace" value={m.clicked} total={m.sent || 1} color={C.danger} />

        <Text style={styles.section}>Detalle</Text>
        <View style={styles.meta}>
          <Text style={styles.metaItem}>Total de destinatarios: {m.total}</Text>
          <Text style={styles.metaItem}>Pendientes: {m.pending}</Text>
          <Text style={styles.metaItem}>Tasa clic/apertura: {pct(m.clickToOpenRate)}</Text>
          <Text style={styles.metaItem}>Aperturas totales: {m.totalOpens}</Text>
          <Text style={styles.metaItem}>Clics totales: {m.totalClicks}</Text>
          <Text style={styles.metaItem}>Lanzada: {formatDateTime(a.launchedAt)}</Text>
          <Text style={styles.metaItem}>Finalizada: {formatDateTime(a.completedAt)}</Text>
          <Text style={styles.metaItem}>Generado: {formatDateTime(a.generatedAt)}</Text>
        </View>

        <Text style={styles.footer}>
          Ejercicio interno y autorizado de concientización en seguridad. Las tasas de apertura son
          referenciales (los clientes de correo y proxies pueden inflarlas o bloquearlas); el clic es el
          indicador principal. No se capturan credenciales ni datos de los usuarios.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderCampaignPdf(args: ReportArgs): Promise<Buffer> {
  return renderToBuffer(<Report {...args} />);
}
