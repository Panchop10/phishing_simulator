'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { postJson } from '@/lib/client';
import { Button } from '@/components/ui/button';

type Preview = {
  counts: { total: number; valid: number; invalid: number; duplicates: number };
  sampleValid: { email: string; nombre: string | null }[];
  errors: { row: number; reason: string }[];
};

export function CsvImporter({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) {
      toast.error('El archivo supera los 5 MB.');
      return;
    }
    const text = await f.text();
    setContent(text);
    setLoading(true);
    try {
      const p = await postJson<Preview>(`/api/campaigns/${campaignId}/import/preview`, { content: text });
      setPreview(p);
      if (p.counts.valid === 0) toast.error('No se encontraron correos válidos. Revisa las columnas del CSV.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo leer el CSV');
      setPreview(null);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!content) return;
    setCommitting(true);
    try {
      const r = await postJson<{ created: number; skippedExisting: number; capped: boolean; cap: number }>(
        `/api/campaigns/${campaignId}/import/commit`,
        { content },
      );
      let msg = `${r.created} destinatarios importados`;
      if (r.skippedExisting) msg += `, ${r.skippedExisting} ya existían`;
      if (r.capped) msg += ` (límite de ${r.cap} alcanzado)`;
      toast.success(msg + '.');
      setContent(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo importar');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:text-sm hover:file:bg-primary/90"
        />
        {loading ? <span className="text-sm text-muted-foreground">Analizando…</span> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        El CSV debe tener una columna de correo (acepta: correo, email). Opcionales: nombre, cargo, departamento.
      </p>

      {preview ? (
        <div className="rounded-md border border-border p-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span><strong>{preview.counts.valid}</strong> válidos</span>
            <span className="text-muted-foreground">{preview.counts.duplicates} duplicados</span>
            <span className="text-destructive">{preview.counts.invalid} inválidos</span>
            <span className="text-muted-foreground">de {preview.counts.total} filas</span>
          </div>
          {preview.sampleValid.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              Ejemplos: {preview.sampleValid.slice(0, 5).map((r) => r.email).join(', ')}
              {preview.counts.valid > 5 ? '…' : ''}
            </div>
          ) : null}
          {preview.errors.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-destructive">Ver {preview.errors.length} errores</summary>
              <ul className="mt-2 space-y-0.5 max-h-40 overflow-auto">
                {preview.errors.map((e, i) => (
                  <li key={i} className="text-muted-foreground">Fila {e.row}: {e.reason}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <Button onClick={commit} disabled={committing || preview.counts.valid === 0}>
            <Upload className="h-4 w-4" />
            {committing ? 'Importando…' : `Importar ${preview.counts.valid} destinatarios`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
