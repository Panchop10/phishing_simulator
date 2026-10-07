import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { NewCampaignForm } from '@/components/campaigns/new-campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const templates = await prisma.template.findMany({
    where: { archivedAt: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return (
    <div>
      <PageHeader title="Nueva campaña" description="Dale un nombre y elige la plantilla. Luego importarás los destinatarios." />
      <NewCampaignForm templates={templates} />
    </div>
  );
}
