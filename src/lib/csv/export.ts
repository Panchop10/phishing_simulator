import Papa from 'papaparse';
import type { CampaignRecipient } from '@prisma/client';
import { formatDateTime } from '../datetime';

/** Etiqueta de interacción derivada de las marcas de tiempo (no del status de envío). */
export function interactionLabel(r: {
  status: string;
  sentAt: Date | null;
  firstOpenedAt: Date | null;
  firstClickedAt: Date | null;
}): string {
  if (r.status === 'FAILED') return 'Falló';
  if (r.status === 'SUPPRESSED') return 'Suprimido';
  if (r.firstClickedAt) return 'Hizo clic';
  if (r.firstOpenedAt) return 'Abrió';
  if (r.sentAt) return 'Enviado';
  return 'Pendiente';
}

const COLUMNS = [
  'correo',
  'nombre',
  'cargo',
  'departamento',
  'estado',
  'enviado_en',
  'abierto_en',
  'clic_en',
  'aperturas',
  'clics',
] as const;

/** CSV de resultados por destinatario, con BOM UTF-8 para que Excel muestre acentos. */
export function buildRecipientsCsv(rows: CampaignRecipient[]): string {
  const data = rows.map((r) => ({
    correo: r.email,
    nombre: r.nombre ?? '',
    cargo: r.cargo ?? '',
    departamento: r.departamento ?? '',
    estado: interactionLabel(r),
    enviado_en: r.sentAt ? formatDateTime(r.sentAt) : '',
    abierto_en: r.firstOpenedAt ? formatDateTime(r.firstOpenedAt) : '',
    clic_en: r.firstClickedAt ? formatDateTime(r.firstClickedAt) : '',
    aperturas: r.openCount,
    clics: r.clickCount,
  }));
  const csv = Papa.unparse(data, { columns: COLUMNS as unknown as string[] });
  return '﻿' + csv;
}
