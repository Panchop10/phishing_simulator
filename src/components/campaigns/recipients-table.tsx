'use client';
import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/datetime';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type RecipientRow = {
  id: string;
  email: string;
  nombre: string | null;
  cargo: string | null;
  departamento: string | null;
  status: string;
  sentAt: string | null;
  firstOpenedAt: string | null;
  firstClickedAt: string | null;
  openCount: number;
  clickCount: number;
  lastError: string | null;
};

type Tone = 'success' | 'warning' | 'danger' | 'muted';

function label(r: RecipientRow): { t: string; v: Tone } {
  if (r.status === 'FAILED') return { t: 'Falló', v: 'danger' };
  if (r.status === 'SUPPRESSED') return { t: 'Suprimido', v: 'muted' };
  if (r.firstClickedAt) return { t: 'Hizo clic', v: 'danger' };
  if (r.firstOpenedAt) return { t: 'Abrió', v: 'warning' };
  if (r.sentAt) return { t: 'Enviado', v: 'success' };
  return { t: 'Pendiente', v: 'muted' };
}

const PAGE = 25;

export function RecipientsTable({ rows }: { rows: RecipientRow[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !needle ||
        r.email.toLowerCase().includes(needle) ||
        (r.nombre ?? '').toLowerCase().includes(needle);
      const matchesF =
        filter === 'all' ||
        (filter === 'clicked' && !!r.firstClickedAt) ||
        (filter === 'opened' && !!r.firstOpenedAt) ||
        (filter === 'sent' && !!r.sentAt) ||
        (filter === 'failed' && r.status === 'FAILED') ||
        (filter === 'pending' && !r.sentAt && r.status !== 'FAILED' && r.status !== 'SUPPRESSED');
      return matchesQ && matchesF;
    });
  }, [rows, q, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por correo o nombre…"
          className="max-w-xs"
        />
        <Select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="max-w-[200px]"
        >
          <option value="all">Todos</option>
          <option value="clicked">Hicieron clic</option>
          <option value="opened">Abrieron</option>
          <option value="sent">Enviados</option>
          <option value="pending">Pendientes</option>
          <option value="failed">Fallidos</option>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Correo</th>
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium">Enviado</th>
              <th className="p-3 font-medium">Abrió</th>
              <th className="p-3 font-medium">Clic</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">Sin resultados.</td>
              </tr>
            ) : (
              slice.map((r) => {
                const l = label(r);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-3">{r.email}</td>
                    <td className="p-3 text-muted-foreground">{r.nombre ?? '—'}</td>
                    <td className="p-3">
                      <Badge variant={l.v}>{l.t}</Badge>
                      {r.status === 'FAILED' && r.lastError ? (
                        <span className="block text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title={r.lastError}>
                          {r.lastError}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(r.sentAt)}</td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(r.firstOpenedAt)}</td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(r.firstClickedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} destinatarios</span>
        {pages > 1 ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0}>Anterior</Button>
            <span>Página {cur + 1} de {pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur >= pages - 1}>Siguiente</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
