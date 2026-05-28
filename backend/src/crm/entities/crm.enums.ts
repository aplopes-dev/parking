export enum CrmSegment {
  NOVO = 'novo',
  REGULAR = 'regular',
  VIP = 'vip',
  INATIVO = 'inativo',
}

export enum CrmInteractionType {
  LIGACAO = 'ligacao',
  VISITA = 'visita',
  PEDIDO = 'pedido',
  CAMPANHA = 'campanha',
  OBSERVACAO = 'observacao',
  FIDELIDADE = 'fidelidade',
}

export enum CrmCampaignStatus {
  RASCUNHO = 'rascunho',
  ATIVA = 'ativa',
  PAUSADA = 'pausada',
  ENCERRADA = 'encerrada',
}

export enum CrmCampaignType {
  PROMOCAO = 'promocao',
  DESCONTO = 'desconto',
  COMBO = 'combo',
  COMUNICADO = 'comunicado',
}

export enum CrmCampaignChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  PDV = 'pdv',
  GERAL = 'geral',
}

export enum CrmDiscountType {
  PERCENTUAL = 'percentual',
  VALOR_FIXO = 'valor_fixo',
  NENHUM = 'nenhum',
}

export enum CrmLoyaltyTier {
  BRONZE = 'bronze',
  PRATA = 'prata',
  OURO = 'ouro',
}

export enum CrmLoyaltyTxType {
  GANHO = 'ganho',
  RESGATE = 'resgate',
  AJUSTE = 'ajuste',
}
