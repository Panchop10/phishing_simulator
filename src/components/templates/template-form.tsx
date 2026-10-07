'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { postJson, putJson } from '@/lib/client';
import { renderPreview, hasLinkPlaceholder, unknownPlaceholders } from '@/lib/templating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VARS = ['{{nombre}}', '{{cargo}}', '{{departamento}}', '{{email}}', '{{enlace}}'];

const DEFAULT_BODY = `<p>Hola {{nombre}},</p>
<p>Detectamos actividad inusual en tu cuenta. Por favor verifica tu identidad lo antes posible:</p>
<p><a href="{{enlace}}">Verificar mi cuenta</a></p>
<p>Gracias,<br/>Equipo de Soporte</p>`;

export function TemplateForm({
  mode,
  initial,
}: {
  mode: 'new' | 'edit';
  initial?: { id: string; name: string; subject: string; bodyHtml: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [body, setBody] = useState(initial?.bodyHtml ?? DEFAULT_BODY);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const linkOk = hasLinkPlaceholder(body);
  const unknown = useMemo(() => unknownPlaceholders(body), [body]);
  const preview = useMemo(() => renderPreview(body), [body]);

  function insert(token: string) {
    const el = ref.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkOk) {
      toast.error('La plantilla debe incluir el marcador {{enlace}}.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'new') {
        await postJson('/api/templates', { name, subject, bodyHtml: body });
        toast.success('Plantilla creada.');
      } else {
        await putJson(`/api/templates/${initial!.id}`, { name, subject, bodyHtml: body });
        toast.success('Plantilla actualizada.');
      }
      router.push('/templates');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre de la plantilla</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Verificación de cuenta" required />
        </div>
        <div>
          <Label htmlFor="subject">Asunto del correo</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Acción requerida: verifica tu cuenta" required />
        </div>
        <div>
          <Label htmlFor="body">Cuerpo (HTML)</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insert(v)}
                className="text-xs rounded border border-border bg-muted px-2 py-1 hover:bg-accent font-mono"
              >
                {v}
              </button>
            ))}
          </div>
          <Textarea id="body" ref={ref} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs min-h-[320px]" required />
          <div className="mt-2 space-y-1 text-xs">
            {linkOk ? (
              <p className="text-success">✓ Incluye el enlace de phishing {'{{enlace}}'}.</p>
            ) : (
              <p className="text-destructive">✗ Falta el marcador obligatorio {'{{enlace}}'} (el enlace rastreable).</p>
            )}
            {unknown.length > 0 ? (
              <p className="text-warning-foreground">⚠ Marcadores no reconocidos: {unknown.map((u) => `{{${u}}}`).join(', ')}</p>
            ) : null}
            <p className="text-muted-foreground">El pixel de apertura se inyecta automáticamente. Variables: nombre, cargo, departamento, email.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar plantilla'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push('/templates')}>Cancelar</Button>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-base">Vista previa (datos de ejemplo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded border border-border bg-white overflow-hidden">
            <iframe title="Vista previa" sandbox="" srcDoc={preview} className="w-full h-[380px] bg-white" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
