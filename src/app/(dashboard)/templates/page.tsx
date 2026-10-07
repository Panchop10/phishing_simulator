import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/datetime';
import { TemplateDeleteButton } from '@/components/templates/template-delete-button';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="Plantillas" description="Correos de phishing reutilizables para tus campañas.">
        <Link href="/templates/new">
          <Button><Plus className="h-4 w-4" />Nueva plantilla</Button>
        </Link>
      </PageHeader>

      {templates.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Aún no tienes plantillas. Crea la primera para empezar.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium">Asunto</th>
                <th className="p-4 font-medium">Actualizada</th>
                <th className="p-4 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="p-4 font-medium">
                    <Link href={`/templates/${t.id}`} className="hover:text-primary">{t.name}</Link>
                  </td>
                  <td className="p-4 text-muted-foreground">{t.subject}</td>
                  <td className="p-4 text-muted-foreground">{formatDateTime(t.updatedAt)}</td>
                  <td className="p-4"><TemplateDeleteButton id={t.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
