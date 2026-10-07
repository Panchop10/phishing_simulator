import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { TemplateForm } from '@/components/templates/template-form';

export const dynamic = 'force-dynamic';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t || t.archivedAt) notFound();

  return (
    <div>
      <PageHeader title="Editar plantilla" description="Los cambios no afectan campañas ya lanzadas." />
      <TemplateForm mode="edit" initial={{ id: t.id, name: t.name, subject: t.subject, bodyHtml: t.bodyHtml }} />
    </div>
  );
}
