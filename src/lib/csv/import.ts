import Papa from 'papaparse';
import { z } from 'zod';

export type FieldKey = 'email' | 'nombre' | 'cargo' | 'departamento';

const SYNONYMS: Record<FieldKey, string[]> = {
  email: ['email', 'correo', 'correoelectronico', 'e-mail', 'mail', 'direccion'],
  nombre: ['nombre', 'nombres', 'name', 'nombrecompleto', 'fullname'],
  cargo: ['cargo', 'puesto', 'posicion', 'title', 'rol', 'role'],
  departamento: ['departamento', 'depto', 'area', 'department', 'gerencia', 'equipo'],
};

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Detecta automáticamente qué columna del CSV corresponde a cada campo. */
export function autoMap(headers: string[]): Partial<Record<FieldKey, string>> {
  const map: Partial<Record<FieldKey, string>> = {};
  for (const h of headers) {
    const n = normalizeHeader(h);
    (Object.keys(SYNONYMS) as FieldKey[]).forEach((field) => {
      if (!map[field] && SYNONYMS[field].some((s) => normalizeHeader(s) === n)) {
        map[field] = h;
      }
    });
  }
  return map;
}

const emailSchema = z.string().trim().toLowerCase().email();

export type ParsedRow = {
  email: string;
  nombre: string | null;
  cargo: string | null;
  departamento: string | null;
};
export type RowError = { row: number; reason: string };
export type ImportResult = {
  headers: string[];
  mapping: Partial<Record<FieldKey, string>>;
  valid: ParsedRow[];
  errors: RowError[];
  duplicatesInFile: number;
  totalRows: number;
};

function pick(raw: Record<string, string>, col: string | undefined): string | null {
  if (!col) return null;
  const v = (raw[col] ?? '').trim();
  return v ? v : null;
}

/** Parsea y valida un CSV. No escribe nada en la base de datos. */
export function parseCsv(
  content: string,
  mappingOverride?: Partial<Record<FieldKey, string>>,
): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const mapping = { ...autoMap(headers), ...(mappingOverride ?? {}) };
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  const emailCol = mapping.email;
  const rows = parsed.data;

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // +1 por encabezado, +1 por índice humano
    if (!emailCol) return;
    const rawEmail = (raw[emailCol] ?? '').trim();
    if (!rawEmail) {
      errors.push({ row: rowNum, reason: 'Correo vacío' });
      return;
    }
    const res = emailSchema.safeParse(rawEmail);
    if (!res.success) {
      errors.push({ row: rowNum, reason: `Correo inválido: ${rawEmail}` });
      return;
    }
    const email = res.data;
    if (seen.has(email)) {
      duplicatesInFile += 1;
      return;
    }
    seen.add(email);
    valid.push({
      email,
      nombre: pick(raw, mapping.nombre),
      cargo: pick(raw, mapping.cargo),
      departamento: pick(raw, mapping.departamento),
    });
  });

  return { headers, mapping, valid, errors, duplicatesInFile, totalRows: rows.length };
}
