import type { CampaignStatus, RecipientStatus } from '@prisma/client';

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  DRAFT: 'Borrador',
  SENDING: 'Enviando',
  SENT: 'Enviada',
  CANCELLED: 'Cancelada',
};

export const recipientStatusLabel: Record<RecipientStatus, string> = {
  PENDING: 'Pendiente',
  SENDING: 'Enviando',
  SENT: 'Enviado',
  FAILED: 'Falló',
  SUPPRESSED: 'Suprimido',
};
