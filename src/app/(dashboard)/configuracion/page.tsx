import { getSettings, toPublicSettings } from '@/lib/settings';
import { PageHeader } from '@/components/shared/page-header';
import { SettingsForm, type SettingsData } from '@/components/shared/settings-form';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const s = toPublicSettings(await getSettings());
  const initial: SettingsData = {
    appBaseUrl: s.appBaseUrl,
    orgName: s.orgName,
    securityContactEmail: s.securityContactEmail,
    smtpHost: s.smtpHost,
    smtpPort: s.smtpPort,
    smtpSecure: s.smtpSecure,
    smtpUser: s.smtpUser,
    mailFromName: s.mailFromName,
    mailFromEmail: s.mailFromEmail,
    mailReplyTo: s.mailReplyTo,
    allowedRecipientDomains: s.allowedRecipientDomains,
    sendRatePerMinute: s.sendRatePerMinute,
    sendBatchSize: s.sendBatchSize,
    maxRecipientsPerCampaign: s.maxRecipientsPerCampaign,
    smtpPasswordSet: s.smtpPasswordSet,
  };
  return (
    <div>
      <PageHeader title="Configuración" description="Ajusta el SMTP, la URL pública y los límites de envío." />
      <SettingsForm initial={initial} />
    </div>
  );
}
