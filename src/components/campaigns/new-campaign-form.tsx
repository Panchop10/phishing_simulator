'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { postJson } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export function NewCampaignForm({ templates }: { templates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [loading, setLoading] = useState(false);

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          <p className="mb-4">Necesitas al menos una plantilla antes de crear una campaña.</p>
          <Link href="/templates/new"><Button>Crear plantilla</Button></Link>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const c = await postJson<{ id: string }>('/api/campaigns', { name, templateId });
      toast.success('Campaña creada. Ahora importa los destinatarios.');
      router.push(`/campaigns/${c.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
          <div>
            <Label htmlFor="name">Nombre de la campaña</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Simulación Finanzas — Octubre" required />
          </div>
          <div>
            <Label htmlFor="template">Plantilla</Label>
            <Select id="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear campaña'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
