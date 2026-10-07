'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { del } from '@/lib/client';
import { Button } from '@/components/ui/button';

export function TemplateDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    if (!confirm('¿Eliminar esta plantilla? Las campañas existentes conservan su copia.')) return;
    setLoading(true);
    try {
      await del(`/api/templates/${id}`);
      toast.success('Plantilla eliminada.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={loading} title="Eliminar">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
