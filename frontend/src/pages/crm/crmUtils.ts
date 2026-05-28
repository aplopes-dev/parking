import {
  CrmCampaignChannel,
  CrmCampaignStatus,
  CrmCampaignType,
  CrmDiscountType,
  CrmInteractionType,
  CrmLoyaltyTier,
  CrmLoyaltyTxType,
  CrmSegment,
} from '../../types';

export const segmentLabel: Record<CrmSegment, string> = {
  novo: 'Novo',
  regular: 'Regular',
  vip: 'VIP',
  inativo: 'Inativo',
};

export const interactionTypeLabel: Record<CrmInteractionType, string> = {
  ligacao: 'Ligação',
  visita: 'Visita',
  pedido: 'Pedido',
  campanha: 'Campanha',
  observacao: 'Observação',
  fidelidade: 'Fidelidade',
};

export const campaignStatusLabel: Record<CrmCampaignStatus, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

export const campaignTypeLabel: Record<CrmCampaignType, string> = {
  promocao: 'Promoção',
  desconto: 'Desconto',
  combo: 'Combo',
  comunicado: 'Comunicado',
};

export const campaignChannelLabel: Record<CrmCampaignChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  pdv: 'PDV',
  geral: 'Geral',
};

export const discountTypeLabel: Record<CrmDiscountType, string> = {
  percentual: 'Percentual',
  valor_fixo: 'Valor fixo',
  nenhum: 'Sem desconto',
};

export const tierLabel: Record<CrmLoyaltyTier, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

export const loyaltyTxLabel: Record<CrmLoyaltyTxType, string> = {
  ganho: 'Ganho',
  resgate: 'Resgate',
  ajuste: 'Ajuste',
};
