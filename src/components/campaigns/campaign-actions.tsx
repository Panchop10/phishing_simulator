'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Rocket, Ban, RefreshCw, Trash2 } from 'lucide-react';
import { postJson, del } from '@/lib/client';
import { Button } from '@/components/ui/button';

type Props = {
  id: string;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'CANCELLED';
  recipientCount: number;
  failedCount: number;
};

export function CampaignActions({ id, status, recipientCount, failedCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function launch() {
    if (!confirm(`¿Lanzar la campaña y enviar a ${recipientCount} destinatarios?`)) return;
    setBusy(true);
    try {
      const r = await postJson<{ toSend: number; suppressed: number }>(`/api/campaigns/${id}/launch`, {});
      toast.success(`Enviando a ${r.toSend} destinatarios${r.suppressed ? `, ${r.suppressed} suprimidos` : ''}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo lanzar');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm('¿Cancelar la campaña? No se enviarán los correos pendientes.')) return;
    setBusy(true);
    try {
      await postJson(`/api/campaigns/${id}/cancel`, {});
      toast.success('Campaña cancelada.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    try {
      const r = await postJson<{ retried: number }>(`/api/campaigns/${id}/retry-failed`, {});
      toast.success(`${r.retried} correos reencolados.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reintentar');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar la campaña y todos sus resultados? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    try {
      await del(`/api/campaigns/${id}`);
      toast.success('Campaña eliminada.');
      router.push('/campaigns');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'DRAFT' ? (
        <Button onClick={launch} disabled={busy || recipientCount === 0}>
          <Rocket className="h-4 w-4" />Lanzar
        </Button>
      ) : null}
      {status === 'SENDING' ? (
        <Button variant="outline" onClick={cancel} disabled={busy}>
          <Ban className="h-4 w-4" />Cancelar
        </Button>
      ) : null}
      {(status === 'SENT' || status === 'CANCELLED') && failedCount > 0 ? (
        <Button variant="outline" onClick={retry} disabled={busy}>
          <RefreshCw className="h-4 w-4" />Reintentar fallidos ({failedCount})
        </Button>
      ) : null}
      {status !== 'SENDING' ? (
        <Button variant="ghost" onClick={remove} disabled={busy} title="Eliminar">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : null}
    </div>
  );
}
