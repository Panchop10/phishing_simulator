import { PageHeader } from '@/components/shared/page-header';
import { TemplateForm } from '@/components/templates/template-form';

export default function NewTemplatePage() {
  return (
    <div>
      <PageHeader title="Nueva plantilla" description="Diseña el correo y revisa la vista previa en tiempo real." />
      <TemplateForm mode="new" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
